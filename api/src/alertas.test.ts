import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derivar } from './estado.ts';
import { PROTOCOLO_CARDIO, PROTOCOLO_GENERAL } from './protocolos.ts';
import { DATOS_PRUEBA, checksDeFase, cirugiaPrueba, ev, flujoCompleto, flujoHasta } from './prueba.ts';
import type { EstadoCirugia } from './tipos.ts';

const P = PROTOCOLO_CARDIO;
const c = cirugiaPrueba();
const abiertas = (s: EstadoCirugia) => s.alertas.filter(a => a.estado === 'abierta').map(a => a.id).sort();
const alerta = (s: EstadoCirugia, id: string) => s.alertas.find(a => a.id === id);

test('el flujo completo termina sin alertas abiertas', () => {
  assert.deepEqual(abiertas(derivar(c, P, flujoCompleto())), []);
});

test('datos obligatorios faltantes desde que se abre la cirugía', () => {
  const s = derivar(cirugiaPrueba({ ...DATOS_PRUEBA, glucometria: null, reserva_sangre: '' }), P, []);
  assert.deepEqual(abiertas(s), ['dato:glucometria', 'dato:reserva_sangre']);
});

test('el antibiótico queda pendiente al iniciar la anestesia y se resuelve al confirmarlo', () => {
  const base = flujoHasta('anestesia');
  assert.deepEqual(abiertas(derivar(c, P, base)), ['critico:antes_incision.antibiotico', 'critico:antes_incision.esterilizacion']);
  const s = derivar(c, P, [...base, ev({ tipo: 'check', fase: 'antes_incision', item: 'antibiotico', valor: 'si' }, 12)]);
  assert.equal(alerta(s, 'critico:antes_incision.antibiotico')?.estado, 'resuelta');
});

test('una alerta se cierra con motivo', () => {
  const s = derivar(c, P, [
    ...flujoHasta('anestesia'),
    ev({ tipo: 'alerta_cierre', alerta: 'critico:antes_incision.antibiotico', motivo: 'Indicación del cirujano' }, 12),
  ]);
  const a = alerta(s, 'critico:antes_incision.antibiotico')!;
  assert.equal(a.estado, 'cerrada');
  assert.equal(a.motivo, 'Indicación del cirujano');
});

test('el conteo descuadrado suena al terminar la cirugía y se resuelve al cuadrar', () => {
  const fin = flujoHasta('fin_cirugia');
  const s1 = derivar(c, P, [...fin, ev({ tipo: 'conteo', material: 'Compresas', cantidad: -9 }, 111)]);
  assert.ok(abiertas(s1).includes('conteo:Compresas'));
  assert.equal(alerta(s1, 'conteo:Compresas')?.mensaje, 'Compresas: entraron 10, salieron 9');
  const s2 = derivar(c, P, [
    ...fin,
    ev({ tipo: 'conteo', material: 'Compresas', cantidad: -9 }, 111),
    ev({ tipo: 'conteo', material: 'Compresas', cantidad: -1 }, 113),
  ]);
  assert.equal(alerta(s2, 'conteo:Compresas')?.estado, 'resuelta');
});

test('alergia sin validar y procedimiento que no coincide', () => {
  const s = derivar(cirugiaPrueba({ ...DATOS_PRUEBA, alergias: 'Penicilina' }), P, [
    ev({ tipo: 'hora', hora: 'ingreso' }, 0),
    ev({ tipo: 'check', fase: 'antes_anestesia', item: 'procedimiento', valor: 'no' }, 1),
  ]);
  assert.ok(abiertas(s).includes('alergia'));
  assert.ok(abiertas(s).includes('negado:antes_anestesia.procedimiento'));
});

test('equipo programado que no se marcó presente', () => {
  assert.ok(abiertas(derivar(c, P, [ev({ tipo: 'hora', hora: 'ingreso' }, 0)])).includes('equipo:anestesiologo'));
});

test('fase cerrada con ítems no críticos sin verificar', () => {
  const s = derivar(c, P, [
    ...flujoHasta('ingreso'),
    ...checksDeFase('antes_anestesia', 5, ['riesgos']),
    ev({ tipo: 'hora', hora: 'anestesia' }, 10),
  ]);
  assert.ok(abiertas(s).includes('fase:antes_anestesia'));
});

test('la fase de anestesia exige verificar vía aérea y riesgo de sangrado', () => {
  const base = [
    ...flujoHasta('ingreso'),
    ...checksDeFase('antes_anestesia', 5, ['via_aerea', 'sangrado']),
    ev({ tipo: 'hora', hora: 'anestesia' }, 10),
  ];
  const pendiente = alerta(derivar(c, P, base), 'fase:antes_anestesia');
  assert.equal(pendiente?.estado, 'abierta');
  assert.match(pendiente!.mensaje, /vía aérea difícil o riesgo de aspiración/);
  assert.match(pendiente!.mensaje, /riesgo de sangrado mayor a 500 ml/);
  const s = derivar(c, P, [
    ...base,
    ev({ tipo: 'check', fase: 'antes_anestesia', item: 'via_aerea', valor: 'si' }, 11),
    ev({ tipo: 'check', fase: 'antes_anestesia', item: 'sangrado', valor: 'na' }, 11),
  ]);
  assert.equal(alerta(s, 'fase:antes_anestesia')?.estado, 'resuelta');
});

test('glucometría fuera de rango y su resolución con una medición nueva', () => {
  const alta = derivar(cirugiaPrueba({ ...DATOS_PRUEBA, glucometria: 380 }), P, []);
  assert.ok(abiertas(alta).includes('rango:glucometria'));
  assert.equal(alerta(alta, 'rango:glucometria')?.severidad, 'critica');
  assert.equal(alerta(alta, 'rango:glucometria')?.mensaje, 'Glucometría fuera de rango: 380 mg/dl');
  const corregida = derivar(cirugiaPrueba({ ...DATOS_PRUEBA, glucometria: 380 }), P, [
    ev({ tipo: 'medicion', medicion: 'glucometria', valor: 180 }, 30),
  ]);
  assert.equal(alerta(corregida, 'rango:glucometria')?.estado, 'resuelta');
});

test('los límites de glucometría son inclusivos y los datos vacíos no disparan rango', () => {
  for (const valor of [null, '', 70, 250]) {
    const s = derivar(cirugiaPrueba({ ...DATOS_PRUEBA, glucometria: valor }), P, []);
    assert.equal(alerta(s, 'rango:glucometria'), undefined);
  }
  const baja = derivar(cirugiaPrueba({ ...DATOS_PRUEBA, glucometria: 69 }), P, []);
  assert.equal(alerta(baja, 'rango:glucometria')?.estado, 'abierta');
});

test('en cirugía general prevalece la última medición vigente para el rango', () => {
  const alta = ev({ tipo: 'medicion', medicion: 'glucometria', valor: 380 }, 30);
  const normal = ev({ tipo: 'medicion', medicion: 'glucometria', valor: 180 }, 31);
  const s = derivar(c, PROTOCOLO_GENERAL, [alta, normal]);
  assert.equal(alerta(s, 'rango:glucometria')?.estado, 'resuelta');
  const anulada = derivar(c, PROTOCOLO_GENERAL, [
    alta, normal, ev({ tipo: 'anulacion', evento_id: normal.id }, 32),
  ]);
  assert.equal(alerta(anulada, 'rango:glucometria')?.estado, 'abierta');
});

test('antibiótico verificado más de 60 minutos antes de la incisión', () => {
  const s = derivar(c, P, [
    ...flujoHasta('anestesia'),
    ev({ tipo: 'check', fase: 'antes_incision', item: 'antibiotico', valor: 'si' }, 12),
    ev({ tipo: 'hora', hora: 'inicio_cirugia' }, 80),
  ]);
  assert.equal(alerta(s, 'antibiotico_ventana')?.estado, 'abierta');
  assert.equal(alerta(s, 'antibiotico_ventana')?.severidad, 'advertencia');
  assert.equal(alerta(s, 'antibiotico_ventana')?.mensaje,
    'Antibiótico verificado 68 min antes de la incisión: evaluar dosis de refuerzo');
});

test('no alerta por ventana antes de incisión, dentro de 60 minutos o sin check afirmativo', () => {
  const check = ev({ tipo: 'check', fase: 'antes_incision', item: 'antibiotico', valor: 'si' }, 12);
  assert.equal(alerta(derivar(c, P, [check]), 'antibiotico_ventana'), undefined);
  for (const minuto of [20, 72]) {
    const s = derivar(c, P, [check, ev({ tipo: 'hora', hora: 'inicio_cirugia' }, minuto)]);
    assert.equal(alerta(s, 'antibiotico_ventana'), undefined);
  }
  for (const valor of ['no', 'na'] as const) {
    const s = derivar(c, P, [
      ev({ tipo: 'check', fase: 'antes_incision', item: 'antibiotico', valor }, 12),
      ev({ tipo: 'hora', hora: 'inicio_cirugia' }, 80),
    ]);
    assert.equal(alerta(s, 'antibiotico_ventana'), undefined);
  }
});

test('alergia a penicilina con un betalactámico dictado', () => {
  const s = derivar(cirugiaPrueba({ ...DATOS_PRUEBA, alergias: 'Penicilina' }), P, [
    ev({ tipo: 'hora', hora: 'ingreso' }, 0),
    ev({ tipo: 'check', fase: 'antes_incision', item: 'antibiotico', valor: 'si' }, 12, { texto: 'cefazolina dos gramos aplicada' }),
  ]);
  assert.equal(alerta(s, 'betalactamico')?.estado, 'abierta');
  assert.equal(alerta(s, 'betalactamico')?.severidad, 'critica');
});

test('cambiar a un antibiótico que no es betalactámico resuelve la alerta', () => {
  const s = derivar(cirugiaPrueba({ ...DATOS_PRUEBA, alergias: 'Penicilina' }), P, [
    ev({ tipo: 'check', fase: 'antes_incision', item: 'antibiotico', valor: 'si' }, 12, { texto: 'cefazolina dos gramos' }),
    ev({ tipo: 'check', fase: 'antes_incision', item: 'antibiotico', valor: 'si' }, 13, { texto: 'cambiamos a clindamicina' }),
  ]);
  assert.equal(alerta(s, 'betalactamico')?.estado, 'resuelta');
});

test('la compatibilidad requiere alergia y dictado vigente de un betalactámico', () => {
  const check = ev({ tipo: 'check', fase: 'antes_incision', item: 'antibiotico', valor: 'si' }, 12,
    { texto: 'cefazolina dos gramos aplicada' });
  assert.equal(alerta(derivar(c, P, [check]), 'betalactamico'), undefined);
  const alergica = cirugiaPrueba({ ...DATOS_PRUEBA, alergias: 'Penicilina' });
  const otro = ev({ tipo: 'check', fase: 'antes_incision', item: 'antibiotico', valor: 'si' }, 12,
    { texto: 'clindamicina aplicada' });
  assert.equal(alerta(derivar(alergica, P, [otro]), 'betalactamico'), undefined);
  assert.equal(alerta(derivar(alergica, P, [check,
    ev({ tipo: 'anulacion', evento_id: check.id }, 13),
  ]), 'betalactamico'), undefined);
});
