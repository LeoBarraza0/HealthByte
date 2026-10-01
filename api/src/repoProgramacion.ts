import { conClinica } from './db.ts';
import type { CirugiaAgenda, NuevaCirugia, ProtocoloResumen, Quirofano } from './tipos.ts';

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

export async function programarCirugia(clinicaId: string, datos: NuevaCirugia): Promise<{ id: string }> {
  return conClinica(clinicaId, async c => {
    // 1. Verificar quirófano y protocolo en la clínica
    const { rowCount: countQx } = await c.query('SELECT 1 FROM quirofano WHERE id = $1', [datos.quirofano_id]);
    if (!countQx) throw new ErrorHttp(400, 'Quirófano no encontrado');

    const { rowCount: countProt } = await c.query('SELECT 1 FROM protocolo WHERE id = $1', [datos.protocolo_id]);
    if (!countProt) throw new ErrorHttp(400, 'Protocolo no encontrado');

    // 2. Buscar o crear paciente
    let pacienteId: string;
    const { rows: pacienteRows } = await c.query<{ id: string }>(
      'SELECT id FROM paciente WHERE tipo_doc = $1 AND num_doc = $2',
      [datos.paciente.tipo_doc, datos.paciente.num_doc]
    );
    if (pacienteRows.length > 0) {
      pacienteId = pacienteRows[0].id;
    } else {
      const { rows: nuevoPaciente } = await c.query<{ id: string }>(
        `INSERT INTO paciente (clinica_id, nombre, tipo_doc, num_doc, fecha_nacimiento, eps, hc)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [clinicaId, datos.paciente.nombre, datos.paciente.tipo_doc, datos.paciente.num_doc, datos.paciente.fecha_nacimiento, datos.paciente.eps, datos.paciente.hc]
      );
      pacienteId = nuevoPaciente[0].id;
    }

    // 3. Convertir ids del equipo en { id, nombre }
    const equipoProgramadoDb: Record<string, { id: string; nombre: string }> = {};
    for (const [rol, usuarioId] of Object.entries(datos.equipo_programado)) {
      if (!usuarioId) continue;
      const { rows: userRows } = await c.query<{ id: string; nombre: string }>(
        'SELECT id, nombre FROM usuario WHERE id = $1',
        [usuarioId]
      );
      if (userRows.length === 0) {
        throw new ErrorHttp(400, 'Integrante del equipo no encontrado');
      }
      equipoProgramadoDb[rol] = { id: userRows[0].id, nombre: userRows[0].nombre };
    }

    // 4. Verificar cruce de horario en el quirófano
    const { rowCount: conflicto } = await c.query(`
      SELECT 1 FROM cirugia
      WHERE quirofano_id = $1
        AND NOT archivada
        AND fecha_programada < ($2::timestamptz + ($3 || ' minutes')::interval)
        AND (fecha_programada + (duracion_min || ' minutes')::interval) > $2::timestamptz
      LIMIT 1
    `, [datos.quirofano_id, datos.fecha_programada, datos.duracion_min]);

    if (conflicto) {
      throw new ErrorHttp(409, 'El quirófano ya está ocupado a esa hora');
    }

    // 5. Insertar cirugía
    const { rows: cirugiaRows } = await c.query<{ id: string }>(`
      INSERT INTO cirugia (
        clinica_id, quirofano_id, paciente_id, protocolo_id, fecha_programada,
        duracion_min, procedimiento, diagnostico, lateralidad, equipo_programado, datos_preop
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      clinicaId,
      datos.quirofano_id,
      pacienteId,
      datos.protocolo_id,
      datos.fecha_programada,
      datos.duracion_min,
      datos.procedimiento,
      datos.diagnostico,
      datos.lateralidad,
      JSON.stringify(equipoProgramadoDb),
      JSON.stringify(datos.datos_preop),
    ]);

    return { id: cirugiaRows[0].id };
  });
}
