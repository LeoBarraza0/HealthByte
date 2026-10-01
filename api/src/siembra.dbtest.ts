import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { conClinica, migrar, pool } from './db.ts';
import { sembrar } from './siembra.ts';

before(async () => { await migrar(); await sembrar(); });
after(() => pool.end());

test('siembra dos clínicas con historial y la cirugía de la demo', async () => {
  const { rows } = await pool.query("SELECT id, slug FROM clinica WHERE slug IN ('caribe', 'norte') ORDER BY slug");
  assert.deepEqual(rows.map(r => r.slug), ['caribe', 'norte']);
  const caribe = rows[0].id;
  const conteo = await conClinica(caribe, async c => (await c.query(`
    SELECT count(*)::int AS cirugias,
           count(*) FILTER (WHERE procedimiento = 'Revascularización miocárdica' AND NOT EXISTS (
             SELECT 1 FROM evento e WHERE e.cirugia_id = cirugia.id))::int AS demo
    FROM cirugia`)).rows[0]);
  assert.equal(conteo.cirugias, 63);
  assert.ok(conteo.demo >= 1);
});

test('sembrar dos veces no duplica', async () => {
  await sembrar();
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM clinica WHERE slug = 'caribe'");
  assert.equal(rows[0].n, 1);
});
