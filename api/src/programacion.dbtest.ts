import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from './app.ts';
import { COOKIE } from './auth.ts';
import { migrar, pool } from './db.ts';
import { CLAVE_DEMO, sembrar } from './siembra.ts';
import type { CirugiaAgenda, Integrante, ProtocoloResumen, Quirofano } from './tipos.ts';

const app = await crearApp();
before(async () => { await migrar(); await sembrar(); });
after(async () => { await app.close(); await pool.end(); });

async function entrar(clinica: string, usuario: string): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/api/login', payload: { clinica, usuario, clave: CLAVE_DEMO } });
  assert.equal(r.statusCode, 200);
  return r.cookies.find(c => c.name === COOKIE)!.value;
}

function hoyBogota(): string {
  const bogota = new Date(Date.now() - 5 * 3600 * 1000);
  return bogota.toISOString().slice(0, 10);
}

test('GET /api/quirofanos lista quirófanos ordenados por nombre', async () => {
  const cookie = await entrar('caribe', 'coordinador');
  const r = await app.inject({ url: '/api/quirofanos', cookies: { [COOKIE]: cookie } });
  assert.equal(r.statusCode, 200);
  const qx = r.json() as Quirofano[];
  assert.ok(qx.length >= 4);
  assert.equal(qx[0].nombre, 'QX 01');
  const nombres = qx.map(q => q.nombre);
  assert.deepEqual(nombres, [...nombres].sort());
});

test('GET /api/protocolos lista protocolos con campos_preop', async () => {
  const cookie = await entrar('caribe', 'coordinador');
  const r = await app.inject({ url: '/api/protocolos', cookies: { [COOKIE]: cookie } });
  assert.equal(r.statusCode, 200);
  const prot = r.json() as ProtocoloResumen[];
  assert.ok(prot.length >= 2);
  const cardio = prot.find(p => p.especialidad === 'Cardiovascular');
  assert.ok(cardio);
  assert.ok(Array.isArray(cardio.campos_preop));
  assert.ok(cardio.campos_preop.length > 0);
});

test('GET /api/agenda valida fecha y devuelve cirugías del día', async () => {
  const cookie = await entrar('caribe', 'coordinador');
  // Fecha inválida
  const rInvalida1 = await app.inject({ url: '/api/agenda?fecha=invalida', cookies: { [COOKIE]: cookie } });
  assert.equal(rInvalida1.statusCode, 400);

  const rInvalida2 = await app.inject({ url: '/api/agenda?fecha=2026-02-31', cookies: { [COOKIE]: cookie } });
  assert.equal(rInvalida2.statusCode, 400);

  const rSinFecha = await app.inject({ url: '/api/agenda', cookies: { [COOKIE]: cookie } });
  assert.equal(rSinFecha.statusCode, 400);

  // Fecha de hoy
  const hoy = hoyBogota();
  const r = await app.inject({ url: `/api/agenda?fecha=${hoy}`, cookies: { [COOKIE]: cookie } });
  assert.equal(r.statusCode, 200);
  const cirugias = r.json() as CirugiaAgenda[];
  assert.ok(cirugias.length >= 3);
  for (const c of cirugias) {
    assert.ok(c.id);
    assert.ok(c.quirofano_id);
    assert.ok(c.quirofano);
    assert.ok(c.fecha_programada.startsWith(hoy));
    assert.equal(typeof c.duracion_min, 'number');
    assert.ok(c.paciente);
    assert.ok(c.procedimiento);
    assert.ok(c.especialidad);
    assert.ok(['programada', 'en_curso', 'realizada'].includes(c.estado));
  }
});

test('GET /api/personal incluye login y cumple Integrante[]', async () => {
  const cookie = await entrar('caribe', 'coordinador');
  const r = await app.inject({ url: '/api/personal', cookies: { [COOKIE]: cookie } });
  assert.equal(r.statusCode, 200);
  const integrantes = r.json() as Integrante[];
  assert.ok(integrantes.length > 0);
  for (const i of integrantes) {
    assert.ok(i.id);
    assert.ok(i.nombre);
    assert.ok(i.rol);
    assert.ok(typeof i.login === 'string' && i.login.length > 0);
  }
  assert.ok(integrantes.some(i => i.login === 'coordinador'));
});
