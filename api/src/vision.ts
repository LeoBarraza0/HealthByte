import { v2 } from '@google-cloud/speech';
import type { Deteccion, LecturaIndicador, ModoCamara, ResultadoVision } from './tipos.ts';

export type Analizar = (imagen: Uint8Array, modo: ModoCamara, materiales: string[]) => Promise<ResultadoVision>;

export interface OpcionesVision {
  proyecto: string;
  modelo?: string; // VISION_MODELO
  token?: () => Promise<string>;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

// GA en Vertex AI desde el 2 de septiembre de 2026, también en el endpoint global. gemini-2.5-flash se retira el 20 de octubre de 2026.
const MODELO = 'gemini-3.8-flash';
const MAX_OBJETOS = 150;

// Las mismas credenciales de Chirp 3 (ADC): en Cloud Run, la cuenta de servicio; en local, `gcloud auth application-default login`.
// El cliente de Speech ya trae GoogleAuth con el alcance cloud-platform, así que no hace falta otra dependencia.
let auth: InstanceType<typeof v2.SpeechClient>['auth'] | undefined;
async function tokenGoogle(): Promise<string> {
  auth ??= new v2.SpeechClient().auth;
  const token = await auth.getAccessToken();
  if (!token) throw new Error('Sin credenciales de Google para Vertex AI');
  return token;
}

const CAJA = { type: 'ARRAY', items: { type: 'INTEGER' } };

function pedido(modo: ModoCamara, materiales: string[]) {
  if (modo === 'conteo') {
    return {
      instruccion: [
        'Eres el contador de material de un quirófano. Recibes una foto desde arriba de la mesa de instrumental y del contador de compresas.',
        `Detecta cada unidad visible de estos materiales: ${materiales.join(', ')}.`,
        'Devuelve un objeto por unidad, con su material y su caja box_2d [ymin, xmin, ymax, xmax] normalizada de 0 a 1000.',
        'Si un paquete cerrado indica cuántas unidades trae y no se pueden ver por separado, devuelve una sola caja con esa cantidad; si no, cantidad es 1.',
        'No cuentes instrumental metálico (pinzas, tijeras, separadores) ni nada que no esté en la lista. Si dudas de un objeto, no lo cuentes y explícalo en nota.',
        `Máximo ${MAX_OBJETOS} objetos.`,
      ].join('\n'),
      texto: 'Cuenta el material de esta mesa.',
      esquema: {
        type: 'OBJECT',
        properties: {
          objetos: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { material: { type: 'STRING', enum: materiales }, cantidad: { type: 'INTEGER' }, box_2d: CAJA },
              required: ['material', 'cantidad', 'box_2d'],
            },
          },
          nota: { type: 'STRING' },
        },
        required: ['objetos'],
      },
    };
  }
  return {
    instruccion: [
      'Verificas la esterilización del instrumental en un quirófano. La foto muestra el indicador químico de un paquete o caja quirúrgica (cinta testigo o tira integradora) y su etiqueta.',
      'indicador: "viro" si cambió al color que indica ciclo completo, "no_viro" si no cambió, "no_visible" si no se ve con claridad.',
      'Lee el lote y la fecha de vencimiento de la etiqueta si son legibles; si no, déjalos vacíos.',
      'box_2d: la caja del indicador, [ymin, xmin, ymax, xmax] normalizada de 0 a 1000.',
    ].join('\n'),
    texto: 'Lee el indicador de esterilización.',
    esquema: {
      type: 'OBJECT',
      properties: {
        indicador: { type: 'STRING', enum: ['viro', 'no_viro', 'no_visible'] },
        lote: { type: 'STRING' }, vence: { type: 'STRING' }, box_2d: CAJA, nota: { type: 'STRING' },
      },
      required: ['indicador'],
    },
  };
}

function caja(v: unknown): Deteccion['caja'] | null {
  if (!Array.isArray(v) || v.length !== 4 || !v.every(n => typeof n === 'number' && Number.isFinite(n))) return null;
  const [y0, x0, y1, x1] = v.map(n => Math.min(1000, Math.max(0, Math.round(n))));
  return [Math.min(y0, y1), Math.min(x0, x1), Math.max(y0, y1), Math.max(x0, x1)];
}
const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null);

/** Lo que dice el modelo es entrada no confiable: solo pasan materiales de la lista, cajas completas y cantidades razonables. */
function leer(datos: Record<string, unknown>, modo: ModoCamara, materiales: string[]): ResultadoVision {
  const nota = texto(datos.nota);
  if (modo === 'esterilizacion') {
    const estados: LecturaIndicador['estado'][] = ['viro', 'no_viro', 'no_visible'];
    const estado = estados.find(e => e === datos.indicador) ?? 'no_visible';
    return { conteo: {}, detecciones: [], nota, indicador: { estado, lote: texto(datos.lote), vence: texto(datos.vence), caja: caja(datos.box_2d) } };
  }
  const detecciones: Deteccion[] = [];
  for (const o of (Array.isArray(datos.objetos) ? datos.objetos : []).slice(0, MAX_OBJETOS) as Record<string, unknown>[]) {
    const c = caja(o?.box_2d);
    const material = String(o?.material);
    if (!c || !materiales.includes(material)) continue;
    const n = o.cantidad;
    const cantidad = typeof n === 'number' && Number.isInteger(n) && n >= 1 ? Math.min(n, 100) : 1;
    detecciones.push({ material, cantidad, caja: c });
  }
  const conteo: Record<string, number> = {};
  for (const d of detecciones) conteo[d.material] = (conteo[d.material] ?? 0) + d.cantidad;
  return { conteo, detecciones, indicador: null, nota };
}

interface Respuesta {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

/** Cuenta el material o lee el indicador de una foto con Gemini en Vertex AI. Solo fetch: sin SDK nuevo. */
export function crearVision(o: OpcionesVision): Analizar {
  const modelo = o.modelo || MODELO;
  return async (imagen, modo, materiales) => {
    if (!o.proyecto) throw new Error('Falta GOOGLE_CLOUD_PROJECT para la visión por cámara');
    const p = pedido(modo, materiales);
    const url = `https://aiplatform.googleapis.com/v1/projects/${o.proyecto}/locations/global/publishers/google/models/${modelo}:generateContent`;
    const r = await (o.fetch ?? fetch)(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${await (o.token ?? tokenGoogle)()}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: p.instruccion }] },
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: Buffer.from(imagen).toString('base64') } }, { text: p.texto }] }],
        // Gemini 3 no admite temperature, topP ni topK. Razonamiento bajo: contar es percepción, no deducción, y baja la latencia.
        generationConfig: { responseMimeType: 'application/json', responseSchema: p.esquema, thinkingConfig: { thinkingLevel: 'LOW' }, maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(o.timeoutMs ?? 30_000),
    });
    if (!r.ok) throw new Error(`Vertex AI ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = (await r.json()) as Respuesta;
    const candidato = j.candidates?.[0];
    const salida = (candidato?.content?.parts ?? []).filter(x => !x.thought).map(x => x.text ?? '').join('').trim();
    if (!salida) throw new Error(`Gemini sin respuesta (${j.promptFeedback?.blockReason ?? candidato?.finishReason ?? 'vacía'})`);
    let datos: unknown;
    try {
      datos = JSON.parse(salida.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    } catch {
      throw new Error('Gemini no devolvió JSON válido');
    }
    return leer((datos ?? {}) as Record<string, unknown>, modo, materiales);
  };
}
