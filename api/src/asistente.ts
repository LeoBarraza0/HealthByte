import { v2 } from '@google-cloud/speech';
import { HORAS } from './tipos.ts';
import type { DatosEvento, Decision, EstadoCirugia, HoraId } from './tipos.ts';
import type { PreguntarFn } from './jev.ts';
import { UMBRALES, describir, estadoParaJev } from './preguntas.ts';
import { numerosConContexto } from './numeros.ts';
import { seudonimizar } from './privacidad.ts';

// Voz con asistente: Chirp 3 transcribe, Gemini propone qué marcar con los campos válidos de la cirugía,
// y Jev confirma cada valor antes de registrar. Si Gemini falla o no propone nada útil, decide el intérprete de siempre.

export interface Accion {
  tipo: 'hora' | 'check' | 'conteo' | 'consumo' | 'hito' | 'medicion' | 'dato' | 'novedad' | 'cerrar_alerta';
  hora?: string; item?: string; valor?: string; material?: string; insumo?: string; hito?: string;
  medicion?: string; campo?: string; alerta?: string; cantidad?: number;
}
export interface Propuesta { dirigida: boolean; intencion: 'registrar' | 'si' | 'no' | 'deshacer' | 'nada'; acciones: Accion[] }
export type Proponer = (frase: string, s: EstadoCirugia, hayPendiente: boolean) => Promise<Propuesta>;

const MODELO = 'gemini-3.8-flash';

let auth: InstanceType<typeof v2.SpeechClient>['auth'] | undefined;
async function tokenGoogle(): Promise<string> {
  auth ??= new v2.SpeechClient().auth; // las credenciales de Chirp 3: en Cloud Run, la cuenta de servicio
  const token = await auth.getAccessToken();
  if (!token) throw new Error('Sin credenciales de Google para Vertex AI');
  return token;
}

const conEnum = (valores: string[]) => (valores.length ? { type: 'STRING', enum: valores } : { type: 'STRING' });

/** Lo que Gemini puede elegir sale de la cirugía: no inventa ítems, materiales ni insumos. */
function opciones(s: EstadoCirugia) {
  const p = s.protocolo;
  return {
    items: p.fases.flatMap(f => f.items.map(i => `${f.id}.${i.id}`)),
    materiales: p.materiales,
    insumos: s.insumos.map(i => i.nombre),
    hitos: p.hitos,
    mediciones: p.mediciones.map(m => m.id),
    campos: p.campos_preop.filter(c => c.tipo === 'numero').map(c => c.id),
    alertas: s.alertas.filter(a => a.estado === 'abierta').map(a => a.id),
  };
}

function pedido(frase: string, s: EstadoCirugia, hayPendiente: boolean) {
  const o = opciones(s);
  const p = s.protocolo;
  const fase = p.fases.find(f => f.id === s.fase_actual);
  const contexto = {
    frase,
    fase_actual: fase?.nombre ?? 'ninguna',
    pendientes_de_la_fase: (fase?.items ?? [])
      .filter(i => !['si', 'na'].includes(s.checks[`${fase!.id}.${i.id}`]?.valor ?? ''))
      .map(i => ({ item: `${fase!.id}.${i.id}`, texto: i.texto })),
    items: p.fases.flatMap(f => f.items.map(i => ({ item: `${f.id}.${i.id}`, texto: i.texto }))),
    horas_registradas: Object.keys(s.horas),
    alertas_abiertas: s.alertas.filter(a => a.estado === 'abierta').map(a => ({ alerta: a.id, mensaje: a.mensaje })),
    ultimos_registros: s.eventos.slice(-3).map(e => describir(e.datos, p)),
    el_tablero_pregunto_algo: hayPendiente,
  };
  const instruccion = [
    'Eres el asistente de voz del tablero de seguridad quirúrgica. Recibes una frase dictada en el quirófano y el estado de la cirugía.',
    'dirigida es false si la frase es conversación del equipo que no pide registrar nada.',
    'intencion: «registrar» si hay algo que anotar; «si» o «no» si el tablero preguntó algo y la frase lo acepta o lo rechaza; «deshacer» si pide anular el último registro; «nada» en otro caso.',
    'acciones: lo que hay que marcar. Usa SOLO los valores de las listas permitidas.',
    '- hora: un momento del procedimiento (ingreso, anestesia, inicio_cirugia, fin_cirugia, salida_recuperacion).',
    '- check: un ítem de la lista de verificación con valor si, no o na. Una frase puede confirmar varios ítems.',
    '- conteo: material que ENTRA al campo (cantidad positiva) o SALE del campo (cantidad negativa).',
    '- consumo: insumos usados en la cirugía, por ejemplo «consumo, dos pares de guantes». No es conteo.',
    '- hito, medicion (con cantidad = valor medido), dato (campo del paciente con cantidad = valor), novedad, cerrar_alerta (alerta abierta).',
    'Toda cantidad tiene que estar dicha en la frase. Si no estás seguro de un valor, no lo propongas.',
  ].join('\n');
  const esquema = {
    type: 'OBJECT',
    properties: {
      dirigida: { type: 'BOOLEAN' },
      intencion: { type: 'STRING', enum: ['registrar', 'si', 'no', 'deshacer', 'nada'] },
      acciones: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            tipo: { type: 'STRING', enum: ['hora', 'check', 'conteo', 'consumo', 'hito', 'medicion', 'dato', 'novedad', 'cerrar_alerta'] },
            hora: conEnum([...HORAS]), item: conEnum(o.items), valor: conEnum(['si', 'no', 'na']),
            material: conEnum(o.materiales), insumo: conEnum(o.insumos), hito: conEnum(o.hitos),
            medicion: conEnum(o.mediciones), campo: conEnum(o.campos), alerta: conEnum(o.alertas),
            cantidad: { type: 'NUMBER' },
          },
          required: ['tipo'],
        },
      },
    },
    required: ['dirigida', 'intencion', 'acciones'],
  };
  return { instruccion, texto: JSON.stringify(contexto), esquema };
}

interface RespuestaGemini {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

/** Gemini en Vertex AI con salida estructurada. Solo fetch: sin SDK nuevo, igual que la visión por cámara. */
export function crearAsistente(o: { proyecto: string; modelo?: string; token?: () => Promise<string>; fetch?: typeof fetch; timeoutMs?: number }): Proponer {
  return async (frase, s, hayPendiente) => {
    if (!o.proyecto) throw new Error('Falta GOOGLE_CLOUD_PROJECT para el asistente de voz');
    const p = pedido(frase, s, hayPendiente);
    const url = `https://aiplatform.googleapis.com/v1/projects/${o.proyecto}/locations/global/publishers/google/models/${o.modelo || MODELO}:generateContent`;
    const r = await (o.fetch ?? fetch)(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${await (o.token ?? tokenGoogle)()}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: p.instruccion }] },
        contents: [{ role: 'user', parts: [{ text: p.texto }] }],
        // Razonamiento mínimo: es una clasificación corta y la latencia manda.
        generationConfig: { responseMimeType: 'application/json', responseSchema: p.esquema, thinkingConfig: { thinkingLevel: 'LOW' }, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(o.timeoutMs ?? 2500),
    });
    if (!r.ok) throw new Error(`Vertex AI ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = (await r.json()) as RespuestaGemini;
    const salida = (j.candidates?.[0]?.content?.parts ?? []).filter(x => !x.thought).map(x => x.text ?? '').join('').trim();
    if (!salida) throw new Error(`Gemini sin respuesta (${j.promptFeedback?.blockReason ?? j.candidates?.[0]?.finishReason ?? 'vacía'})`);
    return JSON.parse(salida.replace(/^```(?:json)?\s*|\s*```$/g, '')) as Propuesta;
  };
}

/** Pasa lo que propuso Gemini a eventos válidos. Las cantidades solo valen si están dichas en la frase. */
export function aEventos(acciones: Accion[], frase: string, s: EstadoCirugia): DatosEvento[] {
  const o = opciones(s);
  const dichos = new Set(numerosConContexto(frase).map(n => n.valor));
  const dicho = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && dichos.has(Math.abs(n));
  const eventos: DatosEvento[] = [];
  for (const a of acciones ?? []) {
    switch (a.tipo) {
      case 'hora':
        if (HORAS.includes(a.hora as HoraId)) eventos.push({ tipo: 'hora', hora: a.hora as HoraId });
        break;
      case 'check': {
        if (!a.item || !o.items.includes(a.item)) break;
        const [fase, item] = a.item.split('.');
        const valor = a.valor === 'no' || a.valor === 'na' ? a.valor : 'si';
        eventos.push({ tipo: 'check', fase, item, valor });
        break;
      }
      case 'conteo':
        if (a.material && o.materiales.includes(a.material) && dicho(a.cantidad) && a.cantidad !== 0) {
          eventos.push({ tipo: 'conteo', material: a.material, cantidad: Math.trunc(a.cantidad) });
        }
        break;
      case 'consumo': {
        const cantidad = a.cantidad ?? 1;
        if (a.insumo && o.insumos.includes(a.insumo) && Number.isInteger(cantidad) && cantidad > 0 && (cantidad === 1 || dicho(cantidad))) {
          eventos.push({ tipo: 'consumo', insumo: a.insumo, cantidad });
        }
        break;
      }
      case 'hito':
        if (a.hito && o.hitos.includes(a.hito)) eventos.push({ tipo: 'hito', hito: a.hito });
        break;
      case 'medicion':
        if (a.medicion && o.mediciones.includes(a.medicion) && dicho(a.cantidad)) eventos.push({ tipo: 'medicion', medicion: a.medicion, valor: a.cantidad });
        break;
      case 'dato':
        if (a.campo && o.campos.includes(a.campo) && dicho(a.cantidad)) eventos.push({ tipo: 'dato', campo: a.campo, valor: a.cantidad });
        break;
      case 'novedad':
        eventos.push({ tipo: 'novedad', texto: frase }); // lo dictado, no un resumen del modelo
        break;
      case 'cerrar_alerta':
        if (a.alerta && o.alertas.includes(a.alerta)) eventos.push({ tipo: 'alerta_cierre', alerta: a.alerta, motivo: frase });
        break;
    }
  }
  return eventos;
}

/**
 * Gemini propone y Jev confirma cada valor con una pregunta de sí o no. La confianza es la menor de esas
 * confirmaciones y decide igual que siempre: registrar, preguntar «¿Registrar esto?» o ignorar.
 * Si Gemini falla o no propone nada válido, decide `respaldo` (el intérprete solo con Jev).
 */
export async function interpretarConAsistente(
  frase: string, s: EstadoCirugia, hayPendiente: boolean,
  proponer: Proponer, preguntar: PreguntarFn, respaldo: () => Promise<Decision>,
): Promise<Decision> {
  const segura = seudonimizar(frase, s.cirugia);
  let propuesta: Propuesta;
  try {
    propuesta = await proponer(segura, s, hayPendiente);
  } catch (e) {
    console.error('Asistente de voz:', (e as Error).message);
    return respaldo();
  }

  if (!propuesta.dirigida || propuesta.intencion === 'nada') return { accion: 'ignorar' };
  if (propuesta.intencion === 'si' || propuesta.intencion === 'no') {
    return hayPendiente ? { accion: 'responder', si: propuesta.intencion === 'si' } : { accion: 'ignorar' };
  }

  const estadoJev = estadoParaJev(segura, s, hayPendiente);
  if (propuesta.intencion === 'deshacer') {
    const r = await preguntar(estadoJev, { deshacer: { type: 'noul', instructions: '¿La frase pide anular o deshacer el último registro?' } });
    const x = r.deshacer;
    return x?.type === 'noul' && x.noul >= UMBRALES.minimo ? { accion: 'deshacer' } : { accion: 'ignorar', no_entendido: true };
  }

  const propuestos = aEventos(propuesta.acciones, segura, s);
  if (!propuestos.length) return respaldo();

  const preguntas = Object.fromEntries(propuestos.map((e, i) => [
    `v${i}`, { type: 'noul' as const, instructions: `¿La frase dice esto: «${describir(e, s.protocolo)}»?` },
  ]));
  const r = await preguntar(estadoJev, preguntas);
  const confirmados = propuestos
    .map((e, i) => { const x = r[`v${i}`]; return { e, c: x?.type === 'noul' ? x.noul : 0 }; })
    .filter(x => x.c >= UMBRALES.minimo);
  if (!confirmados.length) return { accion: 'ignorar', no_entendido: true };

  const confianza = Math.min(...confirmados.map(x => x.c));
  const eventos = confirmados.map(x => x.e);
  return {
    accion: confianza >= UMBRALES.automatico ? 'registrar' : 'confirmar',
    eventos, confianza, resumen: eventos.map(e => describir(e, s.protocolo)).join(' · '),
  };
}
