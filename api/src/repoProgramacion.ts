import { conClinica } from './db.ts';
import type { CirugiaAgenda, ProtocoloResumen, Quirofano } from './tipos.ts';

export class ErrorHttp extends Error {
  codigo: number;
  constructor(codigo: number, mensaje: string) {
    super(mensaje);
    this.codigo = codigo;
  }
}

export async function quirofanos(clinicaId: string): Promise<Quirofano[]> {
  return conClinica(clinicaId, async c => {
    const { rows } = await c.query<Quirofano>('SELECT id, nombre FROM quirofano ORDER BY nombre');
    return rows;
  });
}

export async function protocolos(clinicaId: string): Promise<ProtocoloResumen[]> {
  return conClinica(clinicaId, async c => {
    const { rows } = await c.query<ProtocoloResumen>(`
      SELECT id, especialidad, COALESCE(definicion->'campos_preop', '[]'::jsonb) AS campos_preop
      FROM protocolo
      ORDER BY especialidad
    `);
    return rows;
  });
}

export async function agenda(clinicaId: string, fecha: string): Promise<CirugiaAgenda[]> {
  return conClinica(clinicaId, async c => {
    const { rows } = await c.query<CirugiaAgenda>(`
      SELECT c.id,
             c.quirofano_id,
             q.nombre AS quirofano,
             c.fecha_programada,
             c.duracion_min,
             pa.nombre AS paciente,
             c.procedimiento,
             p.especialidad,
             CASE
               WHEN EXISTS (
                 SELECT 1 FROM evento e
                 WHERE e.cirugia_id = c.id AND e.tipo = 'hora' AND e.datos->>'hora' = 'salida_recuperacion'
               ) THEN 'realizada'
               WHEN EXISTS (
                 SELECT 1 FROM evento e
                 WHERE e.cirugia_id = c.id AND e.tipo = 'hora'
               ) THEN 'en_curso'
               ELSE 'programada'
             END AS estado
      FROM cirugia c
      JOIN quirofano q ON q.id = c.quirofano_id
      JOIN paciente pa ON pa.id = c.paciente_id
      JOIN protocolo p ON p.id = c.protocolo_id
      WHERE NOT c.archivada
        AND c.fecha_programada >= ($1 || 'T00:00:00-05:00')::timestamptz
        AND c.fecha_programada < (($1 || 'T00:00:00-05:00')::timestamptz + interval '1 day')
      ORDER BY c.fecha_programada
    `, [fecha]);
    return rows;
  });
}
