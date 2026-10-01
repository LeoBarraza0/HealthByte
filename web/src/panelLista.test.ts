import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrar, paginar, opciones, filasCsv } from './panelLista.ts';
import type { Panel } from '../../api/src/tipos.ts';

type CirugiaFila = Panel['lista'][number];

const muestra: CirugiaFila[] = [
  {
    id: '1',
    fecha: '2026-09-30T11:00:00.000Z',
    quirofano: 'Quirófano 1',
    paciente: 'Rosa Elena Martínez',
    procedimiento: 'Revascularización miocárdica',
    especialidad: 'Cardiovascular',
    estado: 'realizada',
    alertas_abiertas: 0,
    alertas_cerradas: 0,
    alertas_resueltas: 4,
    protocolo_cumplido: true,
    minutos: 222,
  },
  {
    id: '2',
    fecha: '2026-09-29T11:00:00.000Z',
    quirofano: 'Quirófano 3',
    paciente: 'Andrés Gómez Ruiz',
    procedimiento: 'Cambio valvular aórtico',
    especialidad: 'Cardiovascular',
    estado: 'realizada',
    alertas_abiertas: 0,
    alertas_cerradas: 1,
    alertas_resueltas: 2,
    protocolo_cumplido: false,
    minutos: 245,
  },
  {
    id: '3',
    fecha: '2026-09-28T07:00:00.000Z',
    quirofano: 'Quirófano 2',
    paciente: 'Luisa Vargas Ortiz',
    procedimiento: 'Colecistectomía laparoscópica',
    especialidad: 'Cirugía general',
    estado: 'realizada',
    alertas_abiertas: 1,
    alertas_cerradas: 0,
    alertas_resueltas: 1,
    protocolo_cumplido: true,
    minutos: 80,
  },
];

test('filtrar por texto busca en paciente y procedimiento ignorando tildes y mayúsculas', () => {
  assert.equal(filtrar(muestra, { texto: 'martinez' }).length, 1);
  assert.equal(filtrar(muestra, { texto: 'revascularizacion' }).length, 1);
  assert.equal(filtrar(muestra, { texto: 'gomez' })[0]?.id, '2');
  assert.equal(filtrar(muestra, { texto: 'no-existe' }).length, 0);
});

test('filtrar por quirofano y especialidad', () => {
  assert.equal(filtrar(muestra, { quirofano: 'Quirófano 1' }).length, 1);
  assert.equal(filtrar(muestra, { quirofano: 'Todos' }).length, 3);
  assert.equal(filtrar(muestra, { especialidad: 'Cardiovascular' }).length, 2);
  assert.equal(filtrar(muestra, { especialidad: 'Cirugía general' }).length, 1);
  assert.equal(filtrar(muestra, { especialidad: 'Todas' }).length, 3);
});

test('filtrar por protocolo cumplido o incompleto', () => {
  const cumplidas = filtrar(muestra, { protocolo: 'cumplido' });
  assert.equal(cumplidas.length, 2);
  assert.ok(cumplidas.every(c => c.protocolo_cumplido));

  const incompletas = filtrar(muestra, { protocolo: 'incompleto' });
  assert.equal(incompletas.length, 1);
  assert.equal(incompletas[0]?.id, '2');
});

test('filtrar con alertas sin resolver incluye abiertas o cerradas con motivo', () => {
  const sinResolver = filtrar(muestra, { sinResolver: true });
  assert.equal(sinResolver.length, 2);
  assert.deepEqual(sinResolver.map(c => c.id).sort(), ['2', '3']);
});

test('paginar divide la lista en páginas respetando límites', () => {
  assert.equal(paginar(muestra, 1, 2).length, 2);
  assert.equal(paginar(muestra, 2, 2).length, 1);
  assert.equal(paginar(muestra, 3, 2).length, 0);
  assert.equal(paginar(muestra, 0, 2).length, 2); // página < 1 se normaliza a 1
});

test('opciones extrae quirófanos y especialidades únicos y ordenados', () => {
  const ops = opciones(muestra);
  assert.deepEqual(ops.quirofanos, ['Quirófano 1', 'Quirófano 2', 'Quirófano 3']);
  assert.deepEqual(ops.especialidades, ['Cardiovascular', 'Cirugía general']);
});

test('filasCsv genera la matriz con encabezado y datos formateados', () => {
  const filas = filasCsv(muestra);
  assert.equal(filas.length, 4);
  assert.deepEqual(filas[0], ['Fecha', 'Quirófano', 'Cirugía', 'Paciente', 'Especialidad', 'Estado', 'Protocolo', 'Alertas', 'Duración (min)']);
  assert.equal(filas[1]?.[1], 'Quirófano 1');
  assert.equal(filas[1]?.[2], 'Revascularización miocárdica');
});
