import type { FastifyInstance } from 'fastify';
import { agenda, ErrorHttp, programarCirugia, protocolos, quirofanos } from './repoProgramacion.ts';
import { esFechaValida, validarNuevaCirugia } from './programacion.ts';

export async function rutasProgramacion(app: FastifyInstance): Promise<void> {
  app.get('/api/quirofanos', async req => {
    return quirofanos(req.sesion.clinica_id);
  });

  app.get('/api/protocolos', async req => {
    return protocolos(req.sesion.clinica_id);
  });

  app.get('/api/agenda', async (req, rep) => {
    const { fecha } = (req.query ?? {}) as { fecha?: unknown };
    if (!esFechaValida(fecha)) {
      return rep.code(400).send({ error: 'Fecha inválida' });
    }
    return agenda(req.sesion.clinica_id, fecha);
  });

  app.post('/api/cirugias', async (req, rep) => {
    if (req.sesion.rol !== 'coordinador' && req.sesion.rol !== 'admin') {
      return rep.code(403).send({ error: 'Solo coordinación' });
    }
    const validacion = validarNuevaCirugia(req.body);
    if (typeof validacion === 'string') {
      return rep.code(400).send({ error: validacion });
    }
    try {
      const res = await programarCirugia(req.sesion.clinica_id, validacion);
      return rep.code(201).send(res);
    } catch (e) {
      if (e instanceof ErrorHttp) {
        return rep.code(e.codigo).send({ error: e.message });
      }
      throw e;
    }
  });
}
