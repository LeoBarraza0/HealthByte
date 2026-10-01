import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { conClinica, migrar, pool } from './db.ts';

before(migrar);
after(() => pool.end());

async function clinica(nombre: string): Promise<string> {
  const { rows } = await pool.query(
    "INSERT INTO clinica (slug, nombre) VALUES ('prueba-' || gen_random_uuid(), $1) RETURNING id", [nombre]);
  return rows[0].id;
}

test('una clínica no ve los datos de otra', async () => {
  const a = await clinica('A');
  const b = await clinica('B');
  await pool.query("INSERT INTO quirofano (clinica_id, nombre) VALUES ($1, 'QX A'), ($2, 'QX B')", [a, b]);
  const vistos = await conClinica(a, async c => (await c.query("SELECT nombre FROM quirofano WHERE nombre IN ('QX A', 'QX B')")).rows);
  assert.deepEqual(vistos.map(r => r.nombre), ['QX A']);
});

test('sin clínica fijada no se ve nada', async () => {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SET LOCAL ROLE healthbyte_app');
    assert.equal((await c.query('SELECT count(*)::int AS n FROM quirofano')).rows[0].n, 0);
  } finally {
    await c.query('ROLLBACK');
    c.release();
  }
});

test('los eventos no se pueden modificar ni borrar', async () => {
  const a = await clinica('C');
  await assert.rejects(conClinica(a, c => c.query("UPDATE evento SET texto = 'x'")), /permission denied/);
  await assert.rejects(conClinica(a, c => c.query('DELETE FROM evento')), /permission denied/);
});
