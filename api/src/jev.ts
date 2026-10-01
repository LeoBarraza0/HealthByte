export type Pregunta =
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'noul'; instructions: string };
export type Respuesta =
  | { type: 'choice'; choice: string; confidence: number }
  | { type: 'noul'; noul: number };
export type PreguntarFn = (state: unknown, questions: Record<string, Pregunta>) => Promise<Record<string, Respuesta>>;

const URL_JEV = 'https://api.typesafe.ai/v1/systemone';

/** Una llamada a Jev con 2 s de límite y un reintento ante saturación, error del servidor o timeout. */
export function crearJev(apiKey: string, modelo = 'jev-latest'): PreguntarFn {
  return async (state, questions) => {
    for (let intento = 0; ; intento++) {
      try {
        const r = await fetch(URL_JEV, {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model: modelo, state, questions }),
          signal: AbortSignal.timeout(2000),
        });
        if (r.ok) return ((await r.json()) as { answers: Record<string, Respuesta> }).answers;
        const reintentable = r.status === 429 || r.status >= 500;
        if (!reintentable || intento > 0) throw new Error(`Jev ${r.status}: ${await r.text()}`);
      } catch (e) {
        if (intento > 0 || (e as Error).message.startsWith('Jev ')) throw e;
      }
    }
  };
}
