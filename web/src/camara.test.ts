import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Captura, EstadoCirugia } from '../../api/src/tipos.ts';
import { cajaEnPorcentaje, filasConteo, formatearCodigo, momentoDelConteo, resumenCaptura } from './camara.ts';

function estado(horas: EstadoCirugia['horas'], conteo: EstadoCirugia['conteo']): EstadoCirugia {
  return { horas, conteo, protocolo: { materiales: ['Compresas', 'Gasas', 'Hiladillos', 'Drenes'] } } as unknown as EstadoCirugia;
}
const captura = (conteo: Record<string, number>): Captura => ({
  id: 'c1', ts: '2026-10-01T19:55:12.000Z', modo: 'conteo', dispositivo: 'Celular',
  resultado: { conteo, detecciones: [], indicador: null, nota: null },
});

test('el momento del conteo sigue las horas de la cirugía', () => {
  assert.equal(momentoDelConteo(estado({}, {})), 'entrada');
  assert.equal(momentoDelConteo(estado({ inicio_cirugia: 'x' }, {})), 'durante');
  assert.equal(momentoDelConteo(estado({ inicio_cirugia: 'x', fin_cirugia: 'y' }, {})), 'salida');
});

test('antes de la incisión compara lo que ve la cámara con lo registrado', () => {
  const e = estado({}, { Compresas: { entra: 10, sale: 0 }, Gasas: { entra: 20, sale: 0 } });
  const filas = filasConteo(e, captura({ Compresas: 10, Gasas: 18, Hiladillos: 2 }));
  assert.deepEqual(filas.map(f => [f.material, f.referencia, f.camara, f.resultado, f.tono]), [
    ['Compresas', 10, 10, 'Coincide', 'ok'],
    ['Gasas', 20, 18, '2 menos en la mesa', 'aviso'],
    ['Hiladillos', 0, 2, '+2 por registrar', 'aviso'],
  ]);
});

test('al cierre lo que ve la cámara debe cuadrar con lo que entró', () => {
  const e = estado({ inicio_cirugia: 'x', fin_cirugia: 'y' }, { Compresas: { entra: 10, sale: 9 }, Gasas: { entra: 20, sale: 0 } });
  const filas = filasConteo(e, captura({ Compresas: 9, Gasas: 20 }));
  assert.deepEqual(filas.map(f => [f.material, f.referencia, f.camara, f.resultado, f.tono]), [
    ['Compresas', 10, 9, 'Falta 1', 'falta'],
    ['Gasas', 20, 20, 'Cuadra', 'ok'],
  ]);
  assert.deepEqual(filasConteo(e, null).map(f => [f.camara, f.resultado]), [[null, 'Sin foto'], [null, 'Sin foto']]);
});

test('durante la cirugía la cámara solo informa', () => {
  const e = estado({ inicio_cirugia: 'x' }, { Compresas: { entra: 10, sale: 0 } });
  assert.deepEqual(filasConteo(e, captura({ Compresas: 4 })).map(f => [f.camara, f.resultado, f.tono]), [[4, 'En la mesa', 'neutro']]);
});

test('cajas, código y resumen listos para la vista', () => {
  assert.deepEqual(cajaEnPorcentaje([100, 250, 300, 500]), { top: '10%', left: '25%', height: '20%', width: '25%' });
  assert.equal(formatearCodigo('K7Q2M9XD'), 'K7Q2 M9XD');
  assert.equal(resumenCaptura(captura({ Compresas: 9, Gasas: 20 })), 'Compresas 9 · Gasas 20');
  assert.equal(resumenCaptura(captura({})), 'Sin material a la vista');
  const indicador: Captura = { ...captura({}), modo: 'esterilizacion', resultado: { conteo: {}, detecciones: [], nota: null, indicador: { estado: 'no_viro', lote: 'L-1', vence: null, caja: null } } };
  assert.equal(resumenCaptura(indicador), 'Indicador no viró · lote L-1');
});
