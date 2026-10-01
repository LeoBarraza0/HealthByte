import type { FastifyInstance } from 'fastify';
import { agenda, protocolos, quirofanos } from './repoProgramacion.ts';
import { esFechaValida } from './programacion.ts';

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
}
