import pg from 'pg';
import { readFile } from 'node:fs/promises';

// Fechas como texto ISO, igual que en los tipos del contrato.
pg.types.setTypeParser(1184, v => new Date(v).toISOString()); // timestamptz
pg.types.setTypeParser(1082, v => v); // date

const CLINICA_NULA = '00000000-0000-0000-0000-000000000000';

// Lee la conexión de PGHOST, PGUSER, PGPASSWORD, PGDATABASE y PGPORT.
export const pool = new pg.Pool({ max: 5 });

export async function migrar(): Promise<void> {
  await pool.query(await readFile(new URL('../../db/schema.sql', import.meta.url), 'utf8'));
}

/** Transacción con el rol sin privilegios y la clínica fijada: Row-Level Security filtra todo lo demás. */
export async function conClinica<T>(clinicaId: string, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SET LOCAL ROLE healthbyte_app');
    await c.query("SELECT set_config('app.clinica_id', $1, true)", [clinicaId]);
    const resultado = await fn(c);
    await c.query('COMMIT');
    return resultado;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    try {
      await c.query(`SET app.clinica_id = '${CLINICA_NULA}'`);
    } catch {
      // Si la conexión se cerró o falló, se ignora antes de liberar
    }
    c.release();
  }
}
