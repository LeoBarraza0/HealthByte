import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derivar } from './estado.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';
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
  assert.deepEqual(abiertas(derivar(c, P, base)), ['critico:antes_incision.antibiotico']);
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
