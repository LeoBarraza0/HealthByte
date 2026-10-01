import { mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { crearJev } from './jev.ts';

test('envía la clave y el modelo, y reintenta una vez si el servicio está saturado', async t => {
  const respuestas = [
    new Response('saturado', { status: 529 }),
    Response.json({ answers: { dirigida: { type: 'noul', noul: 0.9 } } }),
  ];
  const fetch = mock.method(globalThis, 'fetch', async () => respuestas.shift()!);
  t.after(() => fetch.mock.restore());
  const r = await crearJev('clave')({ frase: 'hola' }, { dirigida: { type: 'noul', instructions: '¿?' } });
  assert.deepEqual(r, { dirigida: { type: 'noul', noul: 0.9 } });
  assert.equal(fetch.mock.callCount(), 2);
  const [url, init] = fetch.mock.calls[0].arguments as [string, RequestInit];
  assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
  assert.equal((init.headers as Record<string, string>).authorization, 'Bearer clave');
  assert.equal(JSON.parse(init.body as string).model, 'jev-latest');
  assert.equal(init.method, 'POST');
  assert.equal((init.headers as Record<string, string>)['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(init.body as string).state, { frase: 'hola' });
  assert.deepEqual(JSON.parse(init.body as string).questions, { dirigida: { type: 'noul', instructions: '¿?' } });
  fetch.mock.restore();
});

test('falla con el detalle si la clave es inválida', async t => {
  const fetch = mock.method(globalThis, 'fetch', async () => new Response('no autorizado', { status: 401 }));
  t.after(() => fetch.mock.restore());
  await assert.rejects(crearJev('mala')({}, {}), /Jev 401: no autorizado/);
  assert.equal(fetch.mock.callCount(), 1);
  fetch.mock.restore();
});

test('falla tras un único reintento si continúa la saturación', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('saturado', { status: 429 }));
  await assert.rejects(crearJev('clave')({}, {}), /Jev 429: saturado/);
  assert.equal(fetch.mock.callCount(), 2);
});

test('limita cada intento a 2 s y reintenta una vez tras el timeout', async t => {
  const timeout = new DOMException('Tiempo agotado', 'TimeoutError');
  const limite = t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort(timeout));
  let intentos = 0;
  const fetch = t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    if (intentos++ === 0) init.signal!.throwIfAborted();
    return Response.json({ answers: {} });
  });
  assert.deepEqual(await crearJev('clave', 'modelo-prueba')({}, {}), {});
  assert.equal(fetch.mock.callCount(), 2);
  assert.deepEqual(limite.mock.calls.map(c => c.arguments), [[2000], [2000]]);
  const [, init] = fetch.mock.calls[1].arguments as [string, RequestInit];
  assert.equal(JSON.parse(init.body as string).model, 'modelo-prueba');
});

test('propaga el timeout si ambos intentos agotan el plazo', async t => {
  const timeout = new DOMException('Tiempo agotado', 'TimeoutError');
  t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort(timeout));
  const fetch = t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    init.signal!.throwIfAborted();
    throw new Error('Falta abortar la petición');
  });
  await assert.rejects(crearJev('clave')({}, {}), e => e === timeout);
  assert.equal(fetch.mock.callCount(), 2);
});
