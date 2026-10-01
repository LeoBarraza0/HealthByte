import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarNuevaCirugia, validarNuevoIntegrante } from './programacion.ts';

const QX_ID = '11111111-1111-1111-1111-111111111111';
const PROT_ID = '22222222-2222-2222-2222-222222222222';
const USER_ID = '33333333-3333-3333-3333-333333333333';

function cirugiaValida(): Record<string, unknown> {
  return {
    quirofano_id: QX_ID,
    protocolo_id: PROT_ID,
    fecha_programada: '2026-10-02T08:00:00-05:00',
    duracion_min: 120,
    paciente: {
      nombre: 'Pedro Pérez',
      tipo_doc: 'CC',
      num_doc: '12345678',
      fecha_nacimiento: '1980-05-15',
      eps: 'Sura',
      hc: 'HC-001',
    },
    procedimiento: 'Apendicectomía',
    diagnostico: 'Apendicitis aguda',
    lateralidad: 'No aplica',
    equipo_programado: {
      cirujano: USER_ID,
    },
    datos_preop: {
      peso: 70,
      alergias: 'Ninguna',
    },
  };
}

test('validarNuevaCirugia acepta una cirugía válida y devuelve el objeto limpio', () => {
  const datos = cirugiaValida();
  const res = validarNuevaCirugia(datos);
  assert.equal(typeof res, 'object');
  if (typeof res === 'object') {
    assert.equal(res.quirofano_id, QX_ID);
    assert.equal(res.protocolo_id, PROT_ID);
    assert.equal(res.duracion_min, 120);
    assert.equal(res.paciente.nombre, 'Pedro Pérez');
    assert.equal(res.paciente.fecha_nacimiento, '1980-05-15');
    assert.equal(res.procedimiento, 'Apendicectomía');
    assert.equal(res.equipo_programado.cirujano, USER_ID);
  }
});

test('validarNuevaCirugia rechaza valores no objeto', () => {
  assert.equal(typeof validarNuevaCirugia(null), 'string');
  assert.equal(typeof validarNuevaCirugia(undefined), 'string');
  assert.equal(typeof validarNuevaCirugia('cadena'), 'string');
  assert.equal(typeof validarNuevaCirugia(123), 'string');
  assert.equal(typeof validarNuevaCirugia([]), 'string');
});

test('validarNuevaCirugia valida quirofano_id y protocolo_id como uuid', () => {
  const sinQx = { ...cirugiaValida(), quirofano_id: 'invalido' };
  assert.equal(typeof validarNuevaCirugia(sinQx), 'string');

  const sinProt = { ...cirugiaValida(), protocolo_id: 'otro-malo' };
  assert.equal(typeof validarNuevaCirugia(sinProt), 'string');
});

test('validarNuevaCirugia valida fecha_programada ISO', () => {
  const f1 = { ...cirugiaValida(), fecha_programada: 'no-es-fecha' };
  assert.equal(typeof validarNuevaCirugia(f1), 'string');

  const f2 = { ...cirugiaValida(), fecha_programada: '2026-10-02' }; // sin hora / no ISO 8601 completa
  assert.equal(typeof validarNuevaCirugia(f2), 'string');

  // Fechas fuera de calendario (días no existentes)
  const f3 = { ...cirugiaValida(), fecha_programada: '2026-02-30T08:00:00Z' };
  assert.equal(typeof validarNuevaCirugia(f3), 'string');

  const f4 = { ...cirugiaValida(), fecha_programada: '2026-02-29T08:00:00Z' }; // 2026 no bisiesto
  assert.equal(typeof validarNuevaCirugia(f4), 'string');

  const f5 = { ...cirugiaValida(), fecha_programada: '2026-04-31T08:00:00Z' }; // abril solo tiene 30 días
  assert.equal(typeof validarNuevaCirugia(f5), 'string');

  const f6 = { ...cirugiaValida(), fecha_programada: '2026-10-02T25:00:00Z' }; // hora inválida
  assert.equal(typeof validarNuevaCirugia(f6), 'string');

  // Año bisiesto válido
  const fOkBisiesto = { ...cirugiaValida(), fecha_programada: '2024-02-29T08:00:00Z' };
  assert.equal(typeof validarNuevaCirugia(fOkBisiesto), 'object');
});

test('validarNuevaCirugia valida duracion_min entre 15 y 720 entera', () => {
  const d1 = { ...cirugiaValida(), duracion_min: 14 };
  assert.equal(typeof validarNuevaCirugia(d1), 'string');

  const d2 = { ...cirugiaValida(), duracion_min: 721 };
  assert.equal(typeof validarNuevaCirugia(d2), 'string');

  const d3 = { ...cirugiaValida(), duracion_min: 120.5 };
  assert.equal(typeof validarNuevaCirugia(d3), 'string');

  const d4 = { ...cirugiaValida(), duracion_min: '120' };
  assert.equal(typeof validarNuevaCirugia(d4), 'string');
});

test('validarNuevaCirugia valida paciente y campos de texto obligatorios de hasta 200 caracteres', () => {
  const p1 = { ...cirugiaValida(), paciente: null };
  assert.equal(typeof validarNuevaCirugia(p1), 'string');

  const p2 = { ...cirugiaValida(), paciente: { ...cirugiaValida().paciente as object, nombre: '   ' } };
  assert.equal(typeof validarNuevaCirugia(p2), 'string');

  const p3 = { ...cirugiaValida(), paciente: { ...cirugiaValida().paciente as object, nombre: 'a'.repeat(201) } };
  assert.equal(typeof validarNuevaCirugia(p3), 'string');

  const p4 = { ...cirugiaValida(), paciente: { ...cirugiaValida().paciente as object, fecha_nacimiento: '2026-02-31' } };
  assert.equal(typeof validarNuevaCirugia(p4), 'string');

  const p5 = { ...cirugiaValida(), procedimiento: '' };
  assert.equal(typeof validarNuevaCirugia(p5), 'string');

  const p6 = { ...cirugiaValida(), diagnostico: '   ' };
  assert.equal(typeof validarNuevaCirugia(p6), 'string');

  const p7 = { ...cirugiaValida(), lateralidad: 'a'.repeat(201) };
  assert.equal(typeof validarNuevaCirugia(p7), 'string');
});

test('validarNuevaCirugia valida roles y miembros del equipo', () => {
  const e1 = { ...cirugiaValida(), equipo_programado: { rol_falso: USER_ID } };
  assert.equal(typeof validarNuevaCirugia(e1), 'string');

  const e2 = { ...cirugiaValida(), equipo_programado: { cirujano: 'no-uuid' } };
  assert.equal(typeof validarNuevaCirugia(e2), 'string');
});

test('validarNuevoIntegrante valida datos correctos y devuelve el objeto limpio', () => {
  const valido = {
    nombre: ' Carlos Gómez ',
    rol: 'anestesiologo',
    login: 'carlos.gomez',
    clave: 'claveSecreta123',
  };
  const res = validarNuevoIntegrante(valido);
  assert.equal(typeof res, 'object');
  if (typeof res === 'object') {
    assert.equal(res.nombre, 'Carlos Gómez');
    assert.equal(res.rol, 'anestesiologo');
    assert.equal(res.login, 'carlos.gomez');
    assert.equal(res.clave, 'claveSecreta123');
  }
});

test('validarNuevoIntegrante rechaza entradas inválidas', () => {
  assert.equal(typeof validarNuevoIntegrante(null), 'string');
  assert.equal(typeof validarNuevoIntegrante('cadena'), 'string');

  // Nombre vacío
  assert.equal(typeof validarNuevoIntegrante({ nombre: '  ', rol: 'cirujano', login: 'cirujano1', clave: 'password123' }), 'string');

  // Rol inválido
  assert.equal(typeof validarNuevoIntegrante({ nombre: 'Carlos', rol: 'astronauta', login: 'cirujano1', clave: 'password123' }), 'string');

  // Login inválido (mayúsculas, caracteres especiales, longitud < 3 o > 30, espacios)
  assert.equal(typeof validarNuevoIntegrante({ nombre: 'Carlos', rol: 'cirujano', login: 'AB', clave: 'password123' }), 'string');
  assert.equal(typeof validarNuevoIntegrante({ nombre: 'Carlos', rol: 'cirujano', login: 'CarlosG', clave: 'password123' }), 'string');
  assert.equal(typeof validarNuevoIntegrante({ nombre: 'Carlos', rol: 'cirujano', login: 'carlos@gomez', clave: 'password123' }), 'string');
  assert.equal(typeof validarNuevoIntegrante({ nombre: 'Carlos', rol: 'cirujano', login: 'a'.repeat(31), clave: 'password123' }), 'string');
  assert.equal(typeof validarNuevoIntegrante({ nombre: 'Carlos', rol: 'cirujano', login: ' carlos.g ', clave: 'password123' }), 'string');
  assert.equal(typeof validarNuevoIntegrante({ nombre: 'Carlos', rol: 'cirujano', login: 'carlos g', clave: 'password123' }), 'string');

  // Clave corta (< 8 caracteres)
  assert.equal(typeof validarNuevoIntegrante({ nombre: 'Carlos', rol: 'cirujano', login: 'carlos.g', clave: '1234567' }), 'string');
});

