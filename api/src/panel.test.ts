import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoDe, resumir } from './panel.ts';
import { derivar } from './estado.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';
import { DATOS_PRUEBA, cirugiaPrueba, ev, flujoCompleto, flujoHasta } from './prueba.ts';

const P = PROTOCOLO_CARDIO;

test('resume estados, cumplimiento y tiempos', () => {
  const completa = derivar(cirugiaPrueba(), P, flujoCompleto());
  const enCurso = derivar(cirugiaPrueba(), P, flujoHasta('anestesia'));
  const programada = derivar(cirugiaPrueba(), P, []);
  const p = resumir([completa, enCurso, programada]);
  assert.deepEqual(p.cirugias, { programadas: 1, en_curso: 1, realizadas: 1 });
  assert.deepEqual(p.checklists, { completas: 1, incompletas: 0 });
  assert.equal(p.cumplimiento, 100);
  assert.equal(p.tiempos.find(t => t.etapa === 'Cirugía')?.minutos, 90);
  assert.equal(p.lista.length, 3);
});

test('una fase verificada después de su hora de cierre no cuenta como cumplida', () => {
  const tarde = flujoCompleto().map(e =>
    e.datos.tipo === 'check' && e.datos.fase === 'antes_anestesia' ? { ...e, ts: '2026-10-01T12:30:00.000Z' } : e);
  const p = resumir([derivar(cirugiaPrueba(), P, tarde)]);
  assert.equal(p.cumplimiento, 0);
  assert.deepEqual(p.checklists, { completas: 1, incompletas: 0 });
});

test('cuenta las alertas cerradas con motivo entre las frecuentes', () => {
  const s = derivar(cirugiaPrueba(), P, [
    ...flujoHasta('anestesia'),
    ev({ tipo: 'alerta_cierre', alerta: 'critico:antes_incision.antibiotico', motivo: 'Indicación médica' }, 12),
  ]);
  const p = resumir([s]);
  assert.equal(p.alertas.cerradas, 1);
  assert.equal(p.alertas.frecuentes[0].veces, 1);
  assert.ok(p.alertas.frecuentes.some(a => a.mensaje.startsWith('Antibiótico profiláctico pendiente')));
});

test('cuenta como atrapado un conteo que se corrigió antes de cerrar', () => {
  const s = derivar(cirugiaPrueba(), P, [
    ...flujoHasta('fin_cirugia'),
    ev({ tipo: 'conteo', material: 'Compresas', cantidad: -9 }, 111),
    ev({ tipo: 'conteo', material: 'Compresas', cantidad: -1 }, 113),
  ]);
  assert.deepEqual(resumir([s]).atrapados, [{ categoria: 'Conteo corregido antes de cerrar', veces: 1 }]);
});

test('sin cirugías devuelve contadores vacíos y promedios sin datos', () => {
  assert.deepEqual(resumir([]), {
    cirugias: { programadas: 0, en_curso: 0, realizadas: 0 },
    checklists: { completas: 0, incompletas: 0 },
    cumplimiento: null,
    alertas: { abiertas: 0, resueltas: 0, cerradas: 0, frecuentes: [] },
    atrapados: [],
    tiempos: [
      { etapa: 'Ingreso → anestesia', minutos: null },
      { etapa: 'Anestesia → incisión', minutos: null },
      { etapa: 'Cirugía', minutos: null },
      { etapa: 'Fin → salida', minutos: null },
    ],
    novedades: { abiertas: 0, solucionadas: 0, minutos_solucion: null },
    duraciones: [],
    lista: [],
  });
});

test('el estado depende del inicio del registro y de la salida a recuperación', () => {
  assert.equal(estadoDe(derivar(cirugiaPrueba(), P, [])), 'programada');
  assert.equal(estadoDe(derivar(cirugiaPrueba(), P, flujoHasta('fin_cirugia'))), 'en_curso');
  assert.equal(estadoDe(derivar(cirugiaPrueba(), P, flujoCompleto())), 'realizada');
});

test('los checks no aplica cumplen y los negados o faltantes dejan checklist incompleta', () => {
  const noAplica = flujoCompleto().map(e => e.datos.tipo === 'check'
    ? { ...e, datos: { ...e.datos, valor: 'na' as const } } : e);
  const negado = flujoCompleto().map(e => e.datos.tipo === 'check' && e.datos.item === 'via_aerea'
    ? { ...e, datos: { ...e.datos, valor: 'no' as const } } : e);
  const faltante = flujoCompleto().filter(e => e.datos.tipo !== 'check' || e.datos.item !== 'sangrado');
  const p = resumir([noAplica, negado, faltante].map(eventos => derivar(cirugiaPrueba(), P, eventos)));
  assert.deepEqual(p.checklists, { completas: 1, incompletas: 2 });
  assert.equal(p.cumplimiento, 33.3);
});

test('agrupa las seis categorías de riesgos resueltos y excluye pendientes rutinarios', () => {
  const s = derivar(cirugiaPrueba({ ...DATOS_PRUEBA, glucometria: null, alergias: 'Penicilina' }), P, [
    ...flujoHasta('anestesia'),
    ev({ tipo: 'check', fase: 'antes_incision', item: 'antibiotico', valor: 'si' }, 12, { texto: 'cefazolina aplicada' }),
    ev({ tipo: 'dato', campo: 'alergias', valor: 'Niega' }, 13),
    ev({ tipo: 'check', fase: 'antes_anestesia', item: 'procedimiento', valor: 'no' }, 14),
    ev({ tipo: 'check', fase: 'antes_anestesia', item: 'procedimiento', valor: 'si' }, 15),
    ev({ tipo: 'dato', campo: 'glucometria', valor: 380 }, 16),
    ev({ tipo: 'medicion', medicion: 'glucometria', valor: 180 }, 17),
    ev({ tipo: 'conteo', material: 'Compresas', cantidad: 10 }, 21),
    ev({ tipo: 'hora', hora: 'fin_cirugia' }, 110),
    ev({ tipo: 'conteo', material: 'Compresas', cantidad: -10 }, 111),
  ]);
  const esperado = [
    { categoria: 'Dato del paciente completado', veces: 2 },
    { categoria: 'Alergia validada', veces: 2 },
    { categoria: 'Compatibilidad de antibiótico confirmada', veces: 2 },
    { categoria: 'Valor clínico fuera de rango atendido', veces: 2 },
    { categoria: 'Discrepancia con lo programado corregida', veces: 2 },
    { categoria: 'Conteo corregido antes de cerrar', veces: 2 },
  ];
  assert.deepEqual(resumir([s, s]).atrapados, esperado);
});

test('las alertas abiertas y cerradas con justificación no cuentan como riesgos resueltos', () => {
  const base = [
    ...flujoHasta('fin_cirugia'),
    ev({ tipo: 'conteo', material: 'Compresas', cantidad: -9 }, 111),
  ];
  const abierta = derivar(cirugiaPrueba(), P, base);
  const cerrada = derivar(cirugiaPrueba(), P, [...base,
    ev({ tipo: 'alerta_cierre', alerta: 'conteo:Compresas', motivo: 'Justificación de prueba' }, 112),
  ]);
  const p = resumir([abierta, cerrada]);
  assert.deepEqual(p.atrapados, []);
  assert.deepEqual(p.alertas.frecuentes.find(a => a.mensaje === 'Compresas: entraron 10, salieron 9'),
    { mensaje: 'Compresas: entraron 10, salieron 9', veces: 2 });
});

test('promedia etapas realizadas, novedades solucionadas y duraciones disponibles', () => {
  const novedad = ev({ tipo: 'novedad', texto: 'Falla ficticia de equipo' }, 30);
  const s = derivar(cirugiaPrueba(), P, [
    ...flujoCompleto(),
    novedad,
    ev({ tipo: 'novedad_atendida', novedad_id: novedad.id, responsable: 'Técnico de prueba' }, 32),
    ev({ tipo: 'novedad_solucionada', novedad_id: novedad.id, acciones: 'Equipo sustituido' }, 40),
    ev({ tipo: 'novedad', texto: 'Pendiente ficticio' }, 42),
    ev({ tipo: 'hito', hito: 'Entrada a bomba' }, 35),
    ev({ tipo: 'hito', hito: 'Salida de bomba' }, 85),
  ]);
  const enCurso = derivar(cirugiaPrueba(), P, flujoHasta('anestesia'));
  const otra = derivar(cirugiaPrueba(), P, flujoCompleto().map(e =>
    e.datos.tipo === 'hora' && e.datos.hora === 'fin_cirugia' ? { ...e, ts: '2026-10-01T13:40:00.000Z' } : e));
  const p = resumir([s, enCurso, otra]);
  assert.deepEqual(p.tiempos, [
    { etapa: 'Ingreso → anestesia', minutos: 10 },
    { etapa: 'Anestesia → incisión', minutos: 10 },
    { etapa: 'Cirugía', minutos: 85 },
    { etapa: 'Fin → salida', minutos: 15 },
  ]);
  assert.deepEqual(p.novedades, { abiertas: 1, solucionadas: 1, minutos_solucion: 10 });
  assert.deepEqual(p.duraciones, [
    { nombre: 'Tiempo de bomba', minutos: 50 },
    { nombre: 'Tiempo de clamp', minutos: null },
  ]);
});

test('la lista ordena por fecha descendente y conserva estado y alertas por cirugía', () => {
  const reciente = { ...cirugiaPrueba(), id: 'reciente', fecha_programada: '2026-10-02T12:00:00.000Z' };
  const antigua = { ...cirugiaPrueba(), id: 'antigua' };
  const p = resumir([
    derivar(antigua, P, flujoCompleto()),
    derivar(reciente, P, flujoHasta('anestesia')),
  ]);
  assert.deepEqual(p.lista.map(s => ({ id: s.id, estado: s.estado, abiertas: s.alertas_abiertas, cerradas: s.alertas_cerradas })), [
    { id: 'reciente', estado: 'en_curso', abiertas: 2, cerradas: 0 },
    { id: 'antigua', estado: 'realizada', abiertas: 0, cerradas: 0 },
  ]);
});

test('cada fila de la lista trae lo que el panel filtra: especialidad, protocolo y duración', () => {
  const p = resumir([derivar(cirugiaPrueba(), P, flujoCompleto()), derivar(cirugiaPrueba(), P, [])]);
  const [hecha, programada] = p.lista;
  assert.equal(hecha.especialidad, P.especialidad);
  assert.equal(hecha.protocolo_cumplido, true);
  assert.equal(typeof hecha.minutos, 'number');
  assert.equal(Number.isInteger(hecha.minutos), true);
  assert.equal(programada.protocolo_cumplido, false);
  assert.equal(programada.minutos, null);
});
