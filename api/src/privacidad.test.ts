import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seudonimizar } from './privacidad.ts';
import { cirugiaPrueba } from './prueba.ts';

const c = { ...cirugiaPrueba(), paciente: { ...cirugiaPrueba().paciente, nombre: 'Rosa Elena Martínez' } };

test('reemplaza el nombre del paciente, con o sin tildes', () => {
  assert.equal(seudonimizar('ingresa Rosa Elena Martinez a sala', c), 'ingresa [PACIENTE] a sala');
});

test('reemplaza documentos y deja los conteos', () => {
  assert.equal(seudonimizar('cédula 41.728.305, entran diez compresas y 20 gasas', c), 'cédula [ID], entran diez compresas y 20 gasas');
});

test('no toca frases sin datos personales', () => {
  assert.equal(seudonimizar('confirmo identidad, procedimiento y sitio', c), 'confirmo identidad, procedimiento y sitio');
});
