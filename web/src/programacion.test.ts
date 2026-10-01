import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aIsoBogota,
  bloque,
  horaBogota,
  hoyBogota,
  sugerirLogin,
  generarClave,
} from './programacion.ts';

test('aIsoBogota convierte fecha y hora de Colombia (UTC-5) a ISO UTC', () => {
  assert.equal(aIsoBogota('2026-10-01', '14:30'), '2026-10-01T19:30:00.000Z');
  assert.equal(aIsoBogota('2026-10-01', '07:00'), '2026-10-01T12:00:00.000Z');
  // Hora sin cero inicial
  assert.equal(aIsoBogota('2026-10-01', '7:00'), '2026-10-01T12:00:00.000Z');
  // Cambio de día en UTC
  assert.equal(aIsoBogota('2026-10-01', '21:00'), '2026-10-02T02:00:00.000Z');
  // Entradas vacías o inválidas no lanzan error
  assert.equal(aIsoBogota('', '14:30'), '');
  assert.equal(aIsoBogota('2026-10-01', ''), '');
  assert.equal(aIsoBogota('invalido', '14:30'), '');
});

test('bloque calcula top y alto en píxeles según hora de inicio y duración', () => {
  // 07:00 Bogota (12:00 UTC), 90 min (1 h 30)
  const b1 = bloque('2026-10-01T12:00:00.000Z', 90);
  assert.deepEqual(b1, { top: 2, alto: 116 });

  // 11:00 Bogota (16:00 UTC), 240 min (4 h)
  const b2 = bloque('2026-10-01T16:00:00.000Z', 240);
  assert.deepEqual(b2, { top: 322, alto: 316 });

  // 09:30 Bogota (14:30 UTC), 120 min (2 h)
  const b3 = bloque('2026-10-01T14:30:00.000Z', 120);
  assert.deepEqual(b3, { top: 202, alto: 156 });

  // Manejo de fecha inválida
  const bInvalido = bloque('invalido', 60);
  assert.deepEqual(bInvalido, { top: 2, alto: 0 });
});

test('horaBogota formatea fecha ISO en hora HH:MM de Colombia', () => {
  assert.equal(horaBogota('2026-10-01T19:30:00.000Z'), '14:30');
  assert.equal(horaBogota('2026-10-01T12:00:00.000Z'), '07:00');
  assert.equal(horaBogota('2026-10-01T05:05:00.000Z'), '00:05');
  // Fecha inválida no produce NaN:NaN
  assert.equal(horaBogota('invalido'), '');
});

test('hoyBogota devuelve la fecha actual en formato YYYY-MM-DD en UTC-5', () => {
  const hoy = hoyBogota();
  assert.match(hoy, /^\d{4}-\d{2}-\d{2}$/);

  // Verificación determinista en bordes de medianoche UTC
  // 02:00 UTC del 2 de octubre son las 21:00 del 1 de octubre en Colombia
  assert.equal(hoyBogota(new Date('2026-10-02T02:00:00.000Z')), '2026-10-01');
  // 05:00 UTC del 2 de octubre son las 00:00 del 2 de octubre en Colombia
  assert.equal(hoyBogota(new Date('2026-10-02T05:00:00.000Z')), '2026-10-02');
});

test('sugerirLogin genera inicial más primer apellido en minúsculas sin tildes', () => {
  assert.equal(sugerirLogin('Sofía Mendoza Ariza'), 'smendoza');
  assert.equal(sugerirLogin('Andrés Polo'), 'apolo');
  assert.equal(sugerirLogin('Ángel Gómez'), 'agomez');
  assert.equal(sugerirLogin('Érika Muñoz'), 'emunoz');
  assert.equal(sugerirLogin('Carmen Fontalvo'), 'cfontalvo');
  assert.equal(sugerirLogin('Admin'), 'admin');
  assert.equal(sugerirLogin(''), '');
  // Manejo de símbolos y puntuación sin generar nombres de usuario inválidos
  assert.equal(sugerirLogin('- Juan Pérez'), 'jperez');
  assert.equal(sugerirLogin('[Maria] Gomez'), 'mgomez');
  assert.equal(sugerirLogin('---'), '');
});

test('generarClave produce contraseña legible de al menos 10 caracteres', () => {
  const clave1 = generarClave();
  const clave2 = generarClave();
  assert.ok(clave1.length >= 10, `Longitud insuficiente: ${clave1.length}`);
  assert.match(clave1, /^[a-z]+-[a-z]+-\d{2}$/);
  assert.ok(clave2.length >= 10, `Longitud insuficiente: ${clave2.length}`);
  assert.match(clave2, /^[a-z]+-[a-z]+-\d{2}$/);
});
