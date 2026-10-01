import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import { COOKIE, leerSesion, login } from './auth.ts';
import { cargarEstado, cirugiasActivas, insertarEventos, personal } from './repo.ts';
import { reiniciarDemo } from './siembra.ts';
import { crearSalas } from './sesion.ts';
import type { Cliente, Deps } from './sesion.ts';
import type { MsgCliente, Sesion } from './tipos.ts';

declare module 'fastify' {
  interface FastifyRequest { sesion: Sesion }
}

export interface OpcionesApp { interpretar: Deps['interpretar']; abrirVoz: Deps['abrirVoz'] }

// Sin voz: lo que usan las pruebas y el arranque antes de conectar Jev y Chirp 3.
const SIN_VOZ: OpcionesApp = {
  interpretar: async () => ({ accion: 'ignorar' }),
  abrirVoz: () => ({ escribir() {}, cerrar() {} }),
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLICAS = new Set(['/api/login', '/api/salud']);

export async function crearApp(opciones: Partial<OpcionesApp> = {}) {
  if (!process.env.SESION_SECRETO) throw new Error('Falta SESION_SECRETO');
  const o = { ...SIN_VOZ, ...opciones };
  const app = Fastify({ logger: process.env.NODE_ENV === 'production' });
  await app.register(cookie, { secret: process.env.SESION_SECRETO });
  await app.register(websocket);
  app.decorateRequest('sesion', null as unknown as Sesion);

  app.addHook('onRequest', async (req, rep) => {
    if (PUBLICAS.has(req.url.split('?')[0])) return;
    const sesion = leerSesion(req);
    if (!sesion) return rep.code(401).send({ error: 'Sin sesión' });
    req.sesion = sesion;
  });

  app.get('/api/salud', async () => ({ ok: true }));

  app.post('/api/login', async (req, rep) => {
    const b = req.body as Record<string, unknown> | undefined;
    if (typeof b?.clinica !== 'string' || typeof b.usuario !== 'string' || typeof b.clave !== 'string') {
      return rep.code(400).send({ error: 'Datos incompletos' });
    }
    const sesion = await login(b.clinica.trim(), b.usuario.trim(), b.clave);
    if (!sesion) return rep.code(401).send({ error: 'Clínica, usuario o clave incorrectos' });
    rep.setCookie(COOKIE, JSON.stringify(sesion), {
      signed: true, httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production',
    });
    return sesion;
  });

  app.post('/api/logout', async (_req, rep) => rep.clearCookie(COOKIE, { path: '/' }).send({ ok: true }));
  app.get('/api/yo', async req => req.sesion);
  app.get('/api/cirugias', async req => cirugiasActivas(req.sesion.clinica_id));

  app.get<{ Params: { id: string } }>('/api/cirugias/:id', async (req, rep) => {
    const estado = UUID.test(req.params.id) ? await cargarEstado(req.sesion.clinica_id, req.params.id) : null;
    return estado ?? rep.code(404).send({ error: 'Cirugía no encontrada' });
  });

  app.get('/api/personal', async req => personal(req.sesion.clinica_id));

  app.post('/api/demo/reiniciar', async (req, rep) => {
    if (req.sesion.rol !== 'coordinador' && req.sesion.rol !== 'admin') return rep.code(403).send({ error: 'Solo coordinación' });
    await reiniciarDemo();
    return { ok: true };
  });

  const salas = crearSalas({ cargarEstado, insertarEventos, interpretar: o.interpretar, abrirVoz: o.abrirVoz });

  app.get('/api/ws', { websocket: true }, (socket, req) => {
    const cliente: Cliente = {
      sesion: req.sesion,
      dispositivo: 'Dispositivo',
      enviar: m => { if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(m)); },
    };
    socket.on('message', (datos: unknown, binario: boolean) => {
      if (binario) return salas.audio(cliente, datos as Buffer);
      let m: MsgCliente;
      try { m = JSON.parse(String(datos)); } catch { return; }
      salas.mensaje(cliente, m).catch(e => {
        req.log.error(e);
        cliente.enviar({ tipo: 'aviso', texto: 'No se pudo registrar' });
      });
    });
    socket.on('close', () => salas.salir(cliente));
  });

  return app;
}
