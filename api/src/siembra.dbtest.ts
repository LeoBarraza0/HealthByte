import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { conClinica, migrar, pool } from './db.ts';
import { sembrar } from './siembra.ts';
import { INSUMOS } from './insumos.ts';
import { INSTRUMENTOS } from './instrumentos.ts';

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

test('cada clínica tiene el catálogo de la hoja de consumo', async () => {
  const { rows } = await pool.query(`
    SELECT c.slug, count(i.id)::int AS n FROM clinica c LEFT JOIN insumo i ON i.clinica_id = c.id
    WHERE c.slug IN ('caribe', 'norte') GROUP BY c.slug ORDER BY c.slug`);
  assert.deepEqual(rows, [{ slug: 'caribe', n: INSUMOS.length }, { slug: 'norte', n: INSUMOS.length }]);
});

test('cada clínica tiene el catálogo de instrumental sin duplicados tras resembrar', async () => {
  await sembrar();
  const { rows } = await pool.query(`
    SELECT c.slug, count(i.id)::int AS n FROM clinica c LEFT JOIN instrumento i ON i.clinica_id = c.id
    WHERE c.slug IN ('caribe', 'norte') GROUP BY c.slug ORDER BY c.slug`);
  assert.deepEqual(rows, [{ slug: 'caribe', n: INSTRUMENTOS.length }, { slug: 'norte', n: INSTRUMENTOS.length }]);
});

test('cada cirugía realizada del historial tiene de tres a seis consumos dentro de la cirugía', async () => {
  const { rows } = await pool.query(`
    SELECT c.id,
      min(e.ts) FILTER (WHERE e.datos->>'hora' = 'inicio_cirugia') AS inicio,
      min(e.ts) FILTER (WHERE e.datos->>'hora' = 'fin_cirugia') AS fin,
      coalesce(jsonb_agg(jsonb_build_object('ts', e.ts, 'datos', e.datos, 'origen', e.origen))
        FILTER (WHERE e.tipo = 'consumo' AND NOT EXISTS (
          SELECT 1 FROM evento a WHERE a.anula_evento_id = e.id)), '[]'::jsonb) AS consumos
    FROM cirugia c JOIN evento e ON e.cirugia_id = c.id
    WHERE EXISTS (SELECT 1 FROM evento s WHERE s.cirugia_id = c.id AND s.datos->>'hora' = 'salida_recuperacion')
    GROUP BY c.id`);
  assert.equal(rows.length, 120);
  const nombres = new Set(INSUMOS.map(i => i.nombre));
  for (const fila of rows) {
    assert.ok(fila.consumos.length >= 3 && fila.consumos.length <= 6);
    for (const e of fila.consumos) {
      assert.ok(nombres.has(e.datos.insumo));
      assert.ok(Number.isInteger(e.datos.cantidad) && e.datos.cantidad >= 1 && e.datos.cantidad <= 8);
      assert.equal(e.origen, 'manual');
      assert.ok(Date.parse(e.ts) >= Date.parse(fila.inicio) && Date.parse(e.ts) <= Date.parse(fila.fin));
    }
  }
});
