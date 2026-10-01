import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from './app.ts';
import { COOKIE } from './auth.ts';
import { insertarEventos } from './repo.ts';
import { migrar, pool } from './db.ts';
import { CLAVE_DEMO, sembrar } from './siembra.ts';
import type { CirugiaActiva, EstadoCirugia, Evento, Panel, Sesion } from './tipos.ts';

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

test('el panel resume el último mes de la clínica y respeta su sesión', async () => {
  assert.equal((await app.inject({ url: '/api/panel?dias=30' })).statusCode, 401);
  const cookie = await entrar('caribe', 'coordinador');
  const r = await app.inject({ url: '/api/panel?dias=30', cookies: { [COOKIE]: cookie } });
  assert.equal(r.statusCode, 200);
  const p = r.json() as Panel;
  assert.ok(p.cirugias.realizadas >= 55);
  assert.ok(p.cumplimiento! > 50);
  const norte = await entrar('norte', 'coordinador');
  const otra = (await app.inject({ url: '/api/panel?dias=30', cookies: { [COOKIE]: norte } })).json() as Panel;
  assert.ok(p.lista.every(c => !otra.lista.some(x => x.id === c.id)));
});

test('el estado trae insumos y la trazabilidad conserva eventos anulados y aísla clínicas', async () => {
  const cookie = await entrar('caribe', 'circulante');
  const panel = (await app.inject({ url: '/api/panel?dias=30', cookies: { [COOKIE]: cookie } })).json() as Panel;
  const c = panel.lista.find(x => x.estado === 'realizada')!;
  const e = (await app.inject({ url: `/api/cirugias/${c.id}`, cookies: { [COOKIE]: cookie } })).json() as EstadoCirugia;
  assert.ok(e.insumos.some(i => i.nombre === 'Guantes, par' && i.categoria === 'general'));
  const sesion = (await app.inject({ url: '/api/yo', cookies: { [COOKIE]: cookie } })).json() as Sesion;
  const autor = { registrado_por: sesion.usuario_id, rol_confirma: null, origen: 'manual' as const, texto: null, confianza: null };
  await insertarEventos(sesion.clinica_id, c.id, [{ ...autor, datos: { tipo: 'consumo', insumo: 'Guantes, par', cantidad: 2 } }]);
  const ruta = `/api/cirugias/${c.id}/eventos`;
  const previos = (await app.inject({ url: ruta, cookies: { [COOKIE]: cookie } })).json() as Evento[];
  const consumo = previos.at(-1)!;
  await insertarEventos(sesion.clinica_id, c.id, [{ ...autor, datos: { tipo: 'anulacion', evento_id: consumo.id } }]);
  const r = await app.inject({ url: ruta, cookies: { [COOKIE]: cookie } });
  assert.equal(r.statusCode, 200);
  const eventos = r.json() as Evento[];
  assert.ok(eventos.some(x => x.id === consumo.id));
  assert.ok(eventos.some(x => x.datos.tipo === 'anulacion' && x.datos.evento_id === consumo.id));
  const vigente = (await app.inject({ url: `/api/cirugias/${c.id}`, cookies: { [COOKIE]: cookie } })).json() as EstadoCirugia;
  assert.ok(!vigente.eventos.some(x => x.id === consumo.id));
  const norte = await entrar('norte', 'circulante');
  for (const [id, sesionCookie] of [[c.id, norte], ['invalido', cookie], ['00000000-0000-0000-0000-000000000000', cookie]]) {
    assert.deepEqual((await app.inject({ url: `/api/cirugias/${id}/eventos`, cookies: { [COOKIE]: sesionCookie } })).json(), []);
  }
});

test('el estado trae el catálogo de instrumental de la clínica', async () => {
  const cookie = await entrar('caribe', 'circulante');
  const c = await demo(cookie);
  const e = (await app.inject({ url: `/api/cirugias/${c.id}`, cookies: { [COOKIE]: cookie } })).json() as EstadoCirugia;
  assert.ok(e.instrumentos.some(i => i.codigo === 'INS-030' && i.nombre === 'Pinzas Kelly' && i.categoria === 'Hemostasia'));
});
