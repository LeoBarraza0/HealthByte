import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corregir } from './correccion.ts';
import { INSTRUMENTOS } from './instrumentos.ts';

const nombres = INSTRUMENTOS.map(i => i.nombre);

test('corrige nombres de instrumental que Chirp transcribió por sonido', () => {
  assert.equal(corregir('se cayó la pinza queli', nombres), 'se cayó la Pinzas Kelly');
  assert.equal(corregir('pásame el porta agujas', nombres), 'pásame el Portaagujas');
  assert.equal(corregir('separadores de farabeu por favor', nombres), 'Separadores de Farabeuf por favor');
  assert.equal(corregir('las tijeras de mesembaun.', nombres), 'las Tijeras de Metzenbaum.');
});

test('no toca lo que no se parece a un instrumento', () => {
  for (const frase of ['entran diez compresas', 'paciente en sala', 'salen nueve hiladillos', 'confirmo identidad']) {
    assert.equal(corregir(frase, nombres), frase);
  }
});

test('ignora los nombres cortos, que dan falsos positivos', () => {
  assert.equal(corregir('media hora', ['Medias']), 'media hora');
});
