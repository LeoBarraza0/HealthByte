import { conClinica } from './db.ts';
import { derivar } from './estado.ts';
import type { Cirugia, CirugiaActiva, EstadoCirugia, Evento, NuevoEvento, Protocolo, Rol } from './tipos.ts';

const SQL_CIRUGIA = `
  SELECT c.id, q.nombre AS quirofano, c.fecha_programada, c.procedimiento, c.diagnostico, c.lateralidad,
         c.equipo_programado, c.datos_preop, p.definicion AS protocolo,
         json_build_object('nombre', pa.nombre, 'tipo_doc', pa.tipo_doc, 'num_doc', pa.num_doc,
           'edad', date_part('year', age(pa.fecha_nacimiento))::int, 'eps', pa.eps, 'hc', pa.hc) AS paciente
  FROM cirugia c
  JOIN quirofano q ON q.id = c.quirofano_id
  JOIN paciente pa ON pa.id = c.paciente_id
  JOIN protocolo p ON p.id = c.protocolo_id`;

const SQL_EVENTOS = `
  SELECT id, cirugia_id, ts, datos, registrado_por, rol_confirma, origen, texto, confianza
  FROM evento WHERE cirugia_id = ANY($1) ORDER BY ts, id`;

function separar(fila: Record<string, unknown>): { cirugia: Cirugia; protocolo: Protocolo } {
  const { protocolo, ...cirugia } = fila;
  return { cirugia: cirugia as unknown as Cirugia, protocolo: protocolo as Protocolo };
}

export async function cargarEstado(clinicaId: string, cirugiaId: string): Promise<EstadoCirugia | null> {
  return conClinica(clinicaId, async c => {
    const { rows: [fila] } = await c.query(`${SQL_CIRUGIA} WHERE c.id = $1`, [cirugiaId]);
    if (!fila) return null;
    const { cirugia, protocolo } = separar(fila);
    const { rows } = await c.query(SQL_EVENTOS, [[cirugiaId]]);
    const estado = derivar(cirugia, protocolo, rows);
    estado.insumos = (await c.query('SELECT nombre, categoria FROM insumo ORDER BY categoria, nombre')).rows;
    estado.instrumentos = (await c.query('SELECT codigo, nombre, categoria FROM instrumento ORDER BY nombre')).rows;
    return estado;
  });
}

export async function cirugiasActivas(clinicaId: string): Promise<CirugiaActiva[]> {
  return conClinica(clinicaId, async c => (await c.query(`
    SELECT c.id, q.nombre AS quirofano, c.fecha_programada, pa.nombre AS paciente, c.procedimiento,
           p.definicion->>'especialidad' AS especialidad,
           EXISTS (SELECT 1 FROM evento e WHERE e.cirugia_id = c.id AND e.tipo = 'hora') AS en_curso
    FROM cirugia c
    JOIN quirofano q ON q.id = c.quirofano_id
    JOIN paciente pa ON pa.id = c.paciente_id
    JOIN protocolo p ON p.id = c.protocolo_id
    WHERE NOT c.archivada AND NOT EXISTS (
      SELECT 1 FROM evento e WHERE e.cirugia_id = c.id AND e.tipo = 'hora' AND e.datos->>'hora' = 'salida_recuperacion')
    ORDER BY c.fecha_programada`)).rows);
}

export async function insertarEventos(clinicaId: string, cirugiaId: string, eventos: NuevoEvento[]): Promise<void> {
  await conClinica(clinicaId, async c => {
    for (const e of eventos) {
      await c.query(`INSERT INTO evento (clinica_id, cirugia_id, tipo, datos, registrado_por, rol_confirma, origen, texto, confianza, anula_evento_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [clinicaId, cirugiaId, e.datos.tipo, e.datos, e.registrado_por, e.rol_confirma, e.origen, e.texto, e.confianza,
          e.datos.tipo === 'anulacion' ? e.datos.evento_id : null]);
    }
  });
}

export async function personal(clinicaId: string): Promise<{ id: string; nombre: string; rol: Rol }[]> {
  return conClinica(clinicaId, async c => (await c.query('SELECT id, nombre, rol FROM usuario ORDER BY rol, nombre')).rows);
}

export async function cargarEstados(clinicaId: string, desde: string): Promise<EstadoCirugia[]> {
  return conClinica(clinicaId, async c => {
    const { rows } = await c.query(`${SQL_CIRUGIA} WHERE c.fecha_programada >= $1 AND NOT c.archivada`, [desde]);
    const { rows: eventos } = await c.query<Evento & { cirugia_id: string }>(SQL_EVENTOS, [rows.map(r => r.id)]);
    const porCirugia = Map.groupBy(eventos, e => e.cirugia_id);
    return rows.map(fila => {
      const { cirugia, protocolo } = separar(fila);
      return derivar(cirugia, protocolo, porCirugia.get(fila.id) ?? []);
    });
  });
}

/** Incluye los eventos anulados y sus anulaciones para la trazabilidad. */
export async function eventosDe(clinicaId: string, cirugiaId: string): Promise<Evento[]> {
  return conClinica(clinicaId, async c => (await c.query<Evento>(SQL_EVENTOS, [[cirugiaId]])).rows);
}
