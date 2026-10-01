import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from './app.ts';
import { COOKIE } from './auth.ts';
import { migrar, pool } from './db.ts';
import { CLAVE_DEMO, sembrar } from './siembra.ts';
import type { CirugiaActiva, EstadoCirugia } from './tipos.ts';

const app = await crearApp();
before(async () => { await migrar(); await sembrar(); });
after(async () => { await app.close(); await pool.end(); });

async function entrar(clinica: string, usuario: string): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/api/login', payload: { clinica, usuario, clave: CLAVE_DEMO } });
  assert.equal(r.statusCode, 200);
  return r.cookies.find(c => c.name === COOKIE)!.value;
}

async function demo(cookie: string): Promise<CirugiaActiva> {
  const r = await app.inject({ url: '/api/cirugias', cookies: { [COOKIE]: cookie } });
  return (r.json() as CirugiaActiva[]).find(x => x.procedimiento === 'Revascularización miocárdica')!;
}

test('sin sesión no hay datos y con clave equivocada no entra', async () => {
  assert.equal((await app.inject({ url: '/api/cirugias' })).statusCode, 401);
  const r = await app.inject({ method: 'POST', url: '/api/login', payload: { clinica: 'caribe', usuario: 'circulante', clave: 'mala' } });
  assert.equal(r.statusCode, 401);
});

test('la cirugía de la demo trae alertas de datos faltantes y de alergia', async () => {
  const cookie = await entrar('caribe', 'circulante');
  const c = await demo(cookie);
  const estado = (await app.inject({ url: `/api/cirugias/${c.id}`, cookies: { [COOKIE]: cookie } })).json() as EstadoCirugia;
  const abiertas = estado.alertas.filter(a => a.estado === 'abierta').map(a => a.id);
  assert.ok(abiertas.includes('dato:glucometria'));
  assert.ok(abiertas.includes('dato:reserva_sangre'));
});

test('una clínica no puede abrir las cirugías de otra', async () => {
  const c = await demo(await entrar('caribe', 'circulante'));
  const norte = await entrar('norte', 'circulante');
  assert.equal((await app.inject({ url: `/api/cirugias/${c.id}`, cookies: { [COOKIE]: norte } })).statusCode, 404);
});

test('solo coordinación puede reiniciar la demo', async () => {
  const circulante = await entrar('caribe', 'circulante');
  assert.equal((await app.inject({ method: 'POST', url: '/api/demo/reiniciar', payload: {}, cookies: { [COOKIE]: circulante } })).statusCode, 403);
});

test('el WebSocket entrega el estado al unirse', async () => {
  const cookie = await entrar('caribe', 'circulante');
  const c = await demo(cookie);
  const ws = await app.injectWS('/api/ws', { headers: { cookie: `${COOKIE}=${encodeURIComponent(cookie)}` } });
  const primero = new Promise<{ tipo: string; estado: EstadoCirugia }>(ok => ws.once('message', (d: unknown) => ok(JSON.parse(String(d)))));
  ws.send(JSON.stringify({ tipo: 'unirse', cirugia_id: c.id, dispositivo: 'Prueba' }));
  const m = await primero;
  assert.equal(m.tipo, 'estado');
  assert.equal(m.estado.cirugia.id, c.id);
  ws.terminate();
});
