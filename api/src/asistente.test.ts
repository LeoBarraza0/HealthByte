import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aEventos, crearAsistente, interpretarConAsistente, type Proponer, type Propuesta } from './asistente.ts';
import type { PreguntarFn, Respuesta } from './jev.ts';
import type { Decision } from './tipos.ts';
import { derivar } from './estado.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';
import { cirugiaPrueba, ev } from './prueba.ts';

const s = derivar(cirugiaPrueba(), PROTOCOLO_CARDIO, [ev({ tipo: 'hora', hora: 'ingreso' }, 0)]);
s.insumos = [{ nombre: 'Guantes, par', categoria: 'general' }];

const gemini = (p: Propuesta): Proponer => async () => p;
/** Jev falso: responde la misma confianza a toda pregunta de sí o no. */
const jev = (noul: number): PreguntarFn => async (_estado, preguntas) =>
  Object.fromEntries(Object.keys(preguntas).map(k => [k, { type: 'noul', noul } satisfies Respuesta]));
const RESPALDO: Decision = { accion: 'ignorar', no_entendido: true };
let usoRespaldo = false;
const respaldo = async () => { usoRespaldo = true; return RESPALDO; };

test('Gemini propone y Jev confirma: se registra con la confianza de Jev', async () => {
  const d = await interpretarConAsistente('confirmo identidad y procedimiento', s, false,
    gemini({ dirigida: true, intencion: 'registrar', acciones: [
      { tipo: 'check', item: 'antes_anestesia.identidad', valor: 'si' },
      { tipo: 'check', item: 'antes_anestesia.procedimiento', valor: 'si' },
    ] }), jev(0.92), respaldo);
  assert.equal(d.accion, 'registrar');
  assert.deepEqual(d.accion === 'registrar' && d.eventos.map(e => e.tipo === 'check' && e.item), ['identidad', 'procedimiento']);
});

test('con confirmación media de Jev, pregunta «¿Registrar esto?»', async () => {
  const d = await interpretarConAsistente('entran diez compresas', s, false,
    gemini({ dirigida: true, intencion: 'registrar', acciones: [{ tipo: 'conteo', material: 'Compresas', cantidad: 10 }] }), jev(0.7), respaldo);
  assert.equal(d.accion, 'confirmar');
});

test('una cantidad que no está en la frase se descarta y decide el intérprete de siempre', async () => {
  usoRespaldo = false;
  const d = await interpretarConAsistente('entran compresas', s, false,
    gemini({ dirigida: true, intencion: 'registrar', acciones: [{ tipo: 'conteo', material: 'Compresas', cantidad: 10 }] }), jev(0.95), respaldo);
  assert.equal(usoRespaldo, true);
  assert.deepEqual(d, RESPALDO);
});

test('si Gemini falla, decide el intérprete de siempre', async () => {
  usoRespaldo = false;
  await interpretarConAsistente('paciente en sala', s, false, async () => { throw new Error('Vertex AI 503'); }, jev(0.9), respaldo);
  assert.equal(usoRespaldo, true);
});

test('la conversación del equipo no registra nada y «sí» responde solo si hay pregunta', async () => {
  assert.deepEqual(await interpretarConAsistente('pásame la pinza', s, false,
    gemini({ dirigida: false, intencion: 'nada', acciones: [] }), jev(0.9), respaldo), { accion: 'ignorar' });
  assert.deepEqual(await interpretarConAsistente('sí', s, true,
    gemini({ dirigida: true, intencion: 'si', acciones: [] }), jev(0.9), respaldo), { accion: 'responder', si: true });
});

test('solo valen ítems, insumos y cantidades de la cirugía', () => {
  const eventos = aEventos([
    { tipo: 'check', item: 'inventado.item' },
    { tipo: 'consumo', insumo: 'Guantes, par' },
    { tipo: 'consumo', insumo: 'Algo que no está en el catálogo' },
    { tipo: 'conteo', material: 'Compresas', cantidad: -9 },
  ], 'salen nueve compresas y un par de guantes', s);
  assert.deepEqual(eventos, [
    { tipo: 'consumo', insumo: 'Guantes, par', cantidad: 1 },
    { tipo: 'conteo', material: 'Compresas', cantidad: -9 },
  ]);
});

test('crearAsistente llama a Gemini en Vertex AI con salida estructurada y lee su JSON', async () => {
  let pedido: { url: string; cuerpo: Record<string, any> } | undefined;
  const falso: typeof fetch = async (url, init) => {
    pedido = { url: String(url), cuerpo: JSON.parse(String(init?.body)) };
    const propuesta: Propuesta = { dirigida: true, intencion: 'registrar', acciones: [{ tipo: 'hora', hora: 'anestesia' }] };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(propuesta) }] } }] }));
  };
  const proponer = crearAsistente({ proyecto: 'p', token: async () => 't', fetch: falso });
  const p = await proponer('inicio de anestesia', s, false);
  assert.match(pedido!.url, /projects\/p\/locations\/global\/publishers\/google\/models\/gemini-/);
  assert.equal(pedido!.cuerpo.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(p.acciones, [{ tipo: 'hora', hora: 'anestesia' }]);
});
