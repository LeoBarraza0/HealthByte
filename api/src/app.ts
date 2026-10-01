import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { COOKIE, leerSesion, login } from './auth.ts';
import { cargarEstado, cirugiasActivas, personal } from './repo.ts';
import { reiniciarDemo } from './siembra.ts';
import type { Sesion } from './tipos.ts';

declare module 'fastify' {
  interface FastifyRequest { sesion: Sesion }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLICAS = new Set(['/api/login', '/api/salud']);

export async function crearApp() {
  if (!process.env.SESION_SECRETO) throw new Error('Falta SESION_SECRETO');
  const app = Fastify({ logger: process.env.NODE_ENV === 'production' });
  await app.register(cookie, { secret: process.env.SESION_SECRETO });
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

  return app;
}
