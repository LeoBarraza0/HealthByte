import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarReporte } from './reporte.ts';
import type { EstadoCirugia, Evento } from '../../api/src/tipos.ts';

const ev = (insumo: string, cantidad: number, origen: Evento['origen']): Evento => ({
  id: insumo + cantidad + origen, ts: '2026-10-01T16:00:00Z', datos: { tipo: 'consumo', insumo, cantidad },
  registrado_por: null, rol_confirma: null, origen, texto: null, confianza: null,
});

const estado = {
  insumos: [
    { nombre: 'Guantes, par', categoria: 'general' }, { nombre: 'Apósito', categoria: 'general' },
    { nombre: 'Hemoclip azul', categoria: 'general' }, { nombre: 'Prolene', categoria: 'sutura' },
    { nombre: 'Ioban', categoria: 'otro' }, { nombre: 'Calentador de fluidos', categoria: 'equipo' },
  ],
  consumo: [
    { insumo: 'Guantes, par', cantidad: 8, del_conteo: false }, { insumo: 'Prolene', cantidad: 3, del_conteo: false },
    { insumo: 'Hemoclip azul', cantidad: 1, del_conteo: false }, { insumo: 'Calentador de fluidos', cantidad: 1, del_conteo: false },
    { insumo: 'Compresas', cantidad: 10, del_conteo: true },
  ],
  eventos: [
    ev('Guantes, par', 2, 'voz'), ev('Guantes, par', 4, 'voz'), ev('Guantes, par', 2, 'manual'),
    ev('Prolene', 4, 'voz'), ev('Prolene', -1, 'manual'), ev('Hemoclip azul', 1, 'voz'), ev('Calentador de fluidos', 1, 'manual'),
  ],
} as unknown as EstadoCirugia;

test('reparte el consumo en las secciones de la planilla, con todas sus filas', () => {
  const r = armarReporte(estado);
  assert.deepEqual(r.generales.map(f => [f.elemento, f.total]), [['Guantes, par', 8], ['Apósito', 0]]);
  assert.deepEqual(r.con_codigo.map(f => [f.elemento, f.total]), [['Hemoclip azul', 1]]);
  assert.deepEqual(r.suturas.map(f => [f.elemento, f.total]), [['Prolene', 3]]);
  assert.deepEqual(r.otros.map(f => [f.elemento, f.total, f.del_conteo]), [['Ioban', 0, false], ['Compresas', 10, true]]);
  assert.equal(r.equipos.flatMap(g => g.items).find(i => i.nombre === 'Calentador de fluidos')?.marcado, true);
});

test('la columna consumo dice cómo se registró cada cantidad', () => {
  const r = armarReporte(estado);
  assert.equal(r.generales[0].consumo, 'Voz 2 + 4 · Toque 2');
  assert.equal(r.suturas[0].consumo, 'Voz 4 · Toque −1');
  assert.equal(r.otros[1].consumo, 'Conteo');
  assert.equal(r.elementos, 5);
  assert.equal(r.unidades, 23);
});
