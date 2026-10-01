import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derivar } from './estado.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';
import { DATOS_PRUEBA, cirugiaPrueba, ev } from './prueba.ts';

const P = PROTOCOLO_CARDIO;

test('registra horas, checks, conteo y la fase actual', () => {
  const s = derivar(cirugiaPrueba(), P, [
    ev({ tipo: 'hora', hora: 'ingreso' }, 0),
    ev({ tipo: 'check', fase: 'antes_anestesia', item: 'identidad', valor: 'si' }, 1, { rol_confirma: 'anestesiologo' }),
    ev({ tipo: 'conteo', material: 'Compresas', cantidad: 10 }, 2),
    ev({ tipo: 'conteo', material: 'Compresas', cantidad: -9 }, 3),
  ]);
  assert.equal(s.horas.ingreso, '2026-10-01T12:00:00.000Z');
  assert.equal(s.checks['antes_anestesia.identidad'].rol, 'anestesiologo');
  assert.deepEqual(s.conteo.Compresas, { entra: 10, sale: 9 });
  assert.equal(s.fase_actual, 'antes_anestesia');
});

test('una hora repetida no reemplaza la primera', () => {
  const s = derivar(cirugiaPrueba(), P, [ev({ tipo: 'hora', hora: 'ingreso' }, 0), ev({ tipo: 'hora', hora: 'ingreso' }, 5)]);
  assert.equal(s.horas.ingreso, '2026-10-01T12:00:00.000Z');
});

test('la anulación quita el evento anulado', () => {
  const e = ev({ tipo: 'conteo', material: 'Gasas', cantidad: 10 }, 0);
  const s = derivar(cirugiaPrueba(), P, [e, ev({ tipo: 'anulacion', evento_id: e.id }, 1)]);
  assert.deepEqual(s.conteo.Gasas, { entra: 0, sale: 0 });
  assert.equal(s.eventos.length, 0);
});

test('ciclo de vida de una novedad y duraciones de hitos', () => {
  const nov = ev({ tipo: 'novedad', texto: 'Falla del aspirador' }, 0);
  const s = derivar(cirugiaPrueba(), P, [
    nov,
    ev({ tipo: 'novedad_atendida', novedad_id: nov.id, responsable: 'Auxiliar' }, 2),
    ev({ tipo: 'novedad_solucionada', novedad_id: nov.id, acciones: 'Se cambió el aspirador' }, 7),
    ev({ tipo: 'hito', hito: 'Entrada a bomba' }, 10),
    ev({ tipo: 'hito', hito: 'Salida de bomba' }, 95),
  ]);
  assert.equal(s.novedades[0].estado, 'solucionada');
  assert.equal(s.novedades[0].responsable, 'Auxiliar');
  assert.equal(s.duraciones.find(d => d.nombre === 'Tiempo de bomba')?.minutos, 85);
  assert.equal(s.duraciones.find(d => d.nombre === 'Tiempo de clamp')?.minutos, null);
});

test('una medición llena el campo preoperatorio vacío del mismo nombre', () => {
  const s = derivar(cirugiaPrueba({ ...DATOS_PRUEBA, glucometria: null }), P, [
    ev({ tipo: 'medicion', medicion: 'glucometria', valor: 102 }, 0),
  ]);
  assert.equal(s.datos.glucometria, 102);
});

test('registra los pasos del protocolo de conteo con su hora', () => {
  const s = derivar(cirugiaPrueba(), P, [
    ev({ tipo: 'accion_conteo', accion: 'cirujano_avisado' }, 0),
    ev({ tipo: 'accion_conteo', accion: 'rx_solicitada' }, 4),
  ]);
  assert.deepEqual(s.acciones_conteo.map(a => a.accion), ['cirujano_avisado', 'rx_solicitada']);
  assert.equal(s.acciones_conteo[1].ts, '2026-10-01T12:04:00.000Z');
});
