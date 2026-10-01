/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aInt16, crearAcumulador, crearVad, rms } from './pcm.ts';

test('convierte a PCM de 16 bits recortando los extremos', () => {
  assert.deepEqual([...aInt16(new Float32Array([1, -1, 0, 2]))], [32767, -32768, 0, 32767]);
});

test('calcula el nivel RMS', () => {
  assert.equal(rms(new Float32Array([0.5, -0.5])), 0.5);
  assert.equal(rms(new Float32Array(0)), 0);
});

test('acumula bloques de tamaño fijo', () => {
  const acumular = crearAcumulador(1600);
  let bloques = 0;
  for (let i = 0; i < 13; i++) bloques += acumular(new Float32Array(128)).length;
  assert.equal(bloques, 1); // 13 × 128 = 1664 muestras
});

test('envía la voz con los bloques previos y corta tras el silencio', () => {
  const vad = crearVad({ umbral: () => 0.1, colgadoMs: 300, previosBloques: 2 });
  const silencio = new Float32Array(1600);
  const voz = new Float32Array(1600).fill(0.5);
  assert.equal(vad.procesar(silencio, 0).length, 0);
  assert.equal(vad.procesar(silencio, 100).length, 0);
  assert.equal(vad.procesar(silencio, 200).length, 0);
  assert.equal(vad.procesar(voz, 300).length, 3); // 2 previos + la voz
  assert.equal(vad.procesar(silencio, 400).length, 1); // dentro de la cola
  assert.equal(vad.procesar(silencio, 700).length, 0);
});
