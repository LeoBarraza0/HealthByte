import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearVision } from './vision.ts';

const MATERIALES = ['Compresas', 'Gasas', 'Agujas Sutura'];
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

/** Un fetch falso que guarda la petición y responde lo que diga el modelo. */
function falso(texto: string | null, estado = 200, extra: Record<string, unknown> = {}) {
  const pedidas: { url: string; init: RequestInit }[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    pedidas.push({ url, init });
    const parts = texto === null ? [] : [{ text: 'pensando…', thought: true }, { text: texto }];
    const cuerpo = { candidates: [{ content: { role: 'model', parts }, finishReason: 'STOP' }], ...extra };
    return new Response(JSON.stringify(cuerpo), { status: estado });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, pedidas };
}

test('pide a Gemini en Vertex AI una caja por objeto, con los materiales del protocolo y sin temperatura', async () => {
  const f = falso('{"objetos":[]}');
  const analizar = crearVision({ proyecto: 'p-1', token: async () => 'tok', fetch: f.fetch });
  await analizar(JPEG, 'conteo', MATERIALES);
  const { url, init } = f.pedidas[0];
  assert.equal(url, 'https://aiplatform.googleapis.com/v1/projects/p-1/locations/global/publishers/google/models/gemini-3.8-flash:generateContent');
  assert.equal((init.headers as Record<string, string>).authorization, 'Bearer tok');
  const cuerpo = JSON.parse(String(init.body));
  const imagen = cuerpo.contents[0].parts.find((p: { inlineData?: unknown }) => p.inlineData).inlineData;
  assert.deepEqual(imagen, { mimeType: 'image/jpeg', data: Buffer.from(JPEG).toString('base64') });
  const g = cuerpo.generationConfig;
  assert.equal(g.responseMimeType, 'application/json');
  assert.deepEqual(g.responseSchema.properties.objetos.items.properties.material.enum, MATERIALES);
  assert.equal(g.thinkingConfig.thinkingLevel, 'LOW');
  for (const k of ['temperature', 'topP', 'topK']) assert.equal(k in g, false);
  assert.match(cuerpo.systemInstruction.parts[0].text, /box_2d/);
});

test('el modelo se cambia sin tocar código', async () => {
  const f = falso('{"objetos":[]}');
  await crearVision({ proyecto: 'p-1', modelo: 'gemini-3.5-flash-lite', token: async () => 'tok', fetch: f.fetch })(JPEG, 'conteo', MATERIALES);
  assert.match(f.pedidas[0].url, /models\/gemini-3\.5-flash-lite:generateContent$/);
});

test('valida lo que devuelve el modelo antes de contarlo', async () => {
  const respuesta = '```json\n' + JSON.stringify({
    objetos: [
      { material: 'Compresas', cantidad: 1, box_2d: [100, 50, 220, 300] },
      { material: 'Compresas', cantidad: 1, box_2d: [240, 50, 360, 300] },
      { material: 'Gasas', cantidad: 10, box_2d: [500, 700, 400, 900] }, // paquete cerrado; caja invertida
      { material: 'Gasas', cantidad: 0, box_2d: [10, 10, 20, 1200] }, // cantidad inválida cuenta 1; caja recortada
      { material: 'Pinza Kelly', cantidad: 1, box_2d: [1, 1, 2, 2] }, // no es material del conteo
      { material: 'Agujas Sutura', cantidad: 1, box_2d: [1, 2, 3] }, // caja incompleta
    ],
    nota: 'Hay una compresa parcialmente tapada',
  }) + '\n```';
  const r = await crearVision({ proyecto: 'p-1', token: async () => 'tok', fetch: falso(respuesta).fetch })(JPEG, 'conteo', MATERIALES);
  assert.deepEqual(r.conteo, { Compresas: 2, Gasas: 11 });
  assert.equal(r.detecciones.length, 4);
  assert.deepEqual(r.detecciones[2], { material: 'Gasas', cantidad: 10, caja: [400, 700, 500, 900] });
  assert.deepEqual(r.detecciones[3].caja, [10, 10, 20, 1000]);
  assert.equal(r.nota, 'Hay una compresa parcialmente tapada');
  assert.equal(r.indicador, null);
});

test('lee el indicador de esterilización y su etiqueta', async () => {
  const respuesta = JSON.stringify({ indicador: 'viro', lote: 'L-2210', vence: '2026-12-01', box_2d: [300, 300, 500, 600], nota: '' });
  const r = await crearVision({ proyecto: 'p-1', token: async () => 'tok', fetch: falso(respuesta).fetch })(JPEG, 'esterilizacion', MATERIALES);
  assert.deepEqual(r.indicador, { estado: 'viro', lote: 'L-2210', vence: '2026-12-01', caja: [300, 300, 500, 600] });
  assert.deepEqual(r.detecciones, []);
  assert.deepEqual(r.conteo, {});
  assert.equal(r.nota, null);

  const raro = await crearVision({ proyecto: 'p-1', token: async () => 'tok', fetch: falso('{"indicador":"quizas"}').fetch })(JPEG, 'esterilizacion', MATERIALES);
  assert.equal(raro.indicador?.estado, 'no_visible');
});

test('falla con un mensaje claro si Vertex AI rechaza la petición o no devuelve JSON', async () => {
  const con = (texto: string | null, estado = 200, extra = {}) =>
    crearVision({ proyecto: 'p-1', token: async () => 'tok', fetch: falso(texto, estado, extra).fetch })(JPEG, 'conteo', MATERIALES);
  await assert.rejects(con('{}', 403), /Vertex AI 403/);
  await assert.rejects(con('esto no es JSON'), /JSON/);
  await assert.rejects(con(null, 200, { candidates: [], promptFeedback: { blockReason: 'SAFETY' } }), /sin respuesta/);
  await assert.rejects(crearVision({ proyecto: '', token: async () => 'tok' })(JPEG, 'conteo', MATERIALES), /GOOGLE_CLOUD_PROJECT/);
});
