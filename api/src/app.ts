import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import { COOKIE, leerSesion, login } from './auth.ts';
import { capturasDe, cargarEstado, cargarEstados, cirugiasActivas, eventosDe, guardarCaptura, imagenDeCaptura, insertarEventos, personal } from './repo.ts';
import { resumir } from './panel.ts';
import { reiniciarDemo } from './siembra.ts';
import { crearSalas } from './sesion.ts';
import { rutasProgramacion } from './rutasProgramacion.ts';
import type { Cliente, ClienteCamara, Deps } from './sesion.ts';
import type { MsgCamara, MsgCliente, Sesion } from './tipos.ts';

declare module 'fastify' {
  interface FastifyRequest { sesion: Sesion }
}

export interface OpcionesApp { interpretar: Deps['interpretar']; abrirVoz: Deps['abrirVoz']; analizar?: Deps['analizar'] }

// Sin voz: lo que usan las pruebas y el arranque antes de conectar Jev y Chirp 3.
const SIN_VOZ: OpcionesApp = {
  interpretar: async () => ({ accion: 'ignorar' }),
  abrirVoz: () => ({ escribir() {}, cerrar() {} }),
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// /api/camara/ws no lleva sesión: el celular entra con el código de un solo uso que muestra la tablet.
const PUBLICAS = new Set(['/api/login', '/api/salud', '/api/camara/ws']);

export async function crearApp(opciones: Partial<OpcionesApp> = {}) {
  if (!process.env.SESION_SECRETO) throw new Error('Falta SESION_SECRETO');
  const o = { ...SIN_VOZ, ...opciones };
  const app = Fastify({ logger: process.env.NODE_ENV === 'production' });
  await app.register(cookie, { secret: process.env.SESION_SECRETO });
  await app.register(websocket, { options: { maxPayload: 4 * 1024 * 1024 } }); // una foto de la cámara pesa menos de 1 MB
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

  app.get<{ Params: { id: string } }>('/api/cirugias/:id/eventos', async req =>
    UUID.test(req.params.id) ? eventosDe(req.sesion.clinica_id, req.params.id) : []);

  app.get<{ Params: { id: string } }>('/api/cirugias/:id/capturas', async req =>
    UUID.test(req.params.id) ? capturasDe(req.sesion.clinica_id, req.params.id) : []);

  app.get<{ Params: { id: string } }>('/api/capturas/:id/imagen', async (req, rep) => {
    const imagen = UUID.test(req.params.id) ? await imagenDeCaptura(req.sesion.clinica_id, req.params.id) : null;
    if (!imagen) return rep.code(404).send({ error: 'Foto no encontrada' });
    return rep.type('image/jpeg').header('cache-control', 'private, max-age=86400').send(imagen); // inmutable
  });

  app.post('/api/demo/reiniciar', async (req, rep) => {
    if (req.sesion.rol !== 'coordinador' && req.sesion.rol !== 'admin') return rep.code(403).send({ error: 'Solo coordinación' });
    await reiniciarDemo();
    return { ok: true };
  });

  app.get<{ Querystring: { dias?: string } }>('/api/panel', async req => {
    const dias = Math.min(90, Math.max(1, Number(req.query.dias) || 30));
    return resumir(await cargarEstados(req.sesion.clinica_id, new Date(Date.now() - dias * 86_400_000).toISOString()));
  });

  await app.register(rutasProgramacion);

  const salas = crearSalas({
    cargarEstado, insertarEventos, interpretar: o.interpretar, abrirVoz: o.abrirVoz, analizar: o.analizar, guardarCaptura,
  });

  app.get('/api/ws', { websocket: true }, (socket, req) => {
    const cliente: Cliente = {
      sesion: req.sesion,
      dispositivo: 'Dispositivo',
      enviar: m => { if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(m)); },
      // Si la red de este dispositivo va lenta, se saltan cuadros del video en lugar de acumularlos en memoria.
      enviarCuadro: jpeg => { if (socket.readyState === socket.OPEN && socket.bufferedAmount < 512 * 1024) socket.send(jpeg); },
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

  app.get('/api/camara/ws', { websocket: true }, (socket, req) => {
    let camara: ClienteCamara | null = null;
    let vinculando = false;
    let cerrado = false;
    const plazo = setTimeout(() => socket.close(4002, 'Sin vincular'), 10_000); // la ruta es pública
    socket.on('message', (datos: unknown, binario: boolean) => {
      if (binario) {
        if (camara) salas.cuadro(camara, datos as Buffer);
        return;
      }
      if (camara || vinculando) return; // ya vinculada: el latido solo mantiene viva la conexión
      let m: MsgCamara;
      try { m = JSON.parse(String(datos)); } catch { return socket.close(4002, 'Mensaje inválido'); }
      if (m?.tipo === 'latido') return;
      const nueva: ClienteCamara = {
        enviar: x => { if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(x)); },
        cerrar: (codigo, motivo) => socket.close(codigo, motivo),
      };
      vinculando = true;
      salas.camara(nueva, m).then(ok => {
        vinculando = false;
        if (!ok) return socket.close(4002, 'Código vencido o inválido');
        if (cerrado) return salas.salirCamara(nueva);
        camara = nueva;
        clearTimeout(plazo);
      }, e => {
        req.log.error(e);
        socket.close(1011, 'No se pudo vincular');
      });
    });
    socket.on('close', () => {
      cerrado = true;
      clearTimeout(plazo);
      if (camara) salas.salirCamara(camara);
    });
  });

  return app;
}
