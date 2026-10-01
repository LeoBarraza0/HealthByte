import { v2 } from '@google-cloud/speech';
import type { CanalVoz, EventosVoz } from './tipos.ts';

interface Resultado { isFinal?: boolean; alternatives?: { transcript?: string }[] }
export interface StreamVoz {
  write(req: unknown): void;
  end(): void;
  on(evento: 'data', f: (d: { results?: Resultado[] }) => void): unknown;
  on(evento: 'error', f: (e: Error) => void): unknown;
}
export interface OpcionesCanal extends EventosVoz {
  proyecto: string;
  frases: string[];
  abrirStream?: () => StreamVoz;
  silencioMs?: number;
  maxMs?: number;
}

export function configuracion(proyecto: string, frases: string[]) {
  return {
    recognizer: `projects/${proyecto}/locations/us/recognizers/_`,
    streamingConfig: {
      config: {
        model: 'chirp_3',
        languageCodes: ['es-US'],
        explicitDecodingConfig: { encoding: 'LINEAR16', sampleRateHertz: 16000, audioChannelCount: 1 },
        features: { enableAutomaticPunctuation: true },
        adaptation: { phraseSets: [{ inlinePhraseSet: { phrases: frases.slice(0, 1000).map(value => ({ value })) } }] },
        denoiserConfig: { denoiseAudio: true },
      },
      streamingFeatures: { interimResults: true },
    },
  };
}

let cliente: InstanceType<typeof v2.SpeechClient> | undefined;
function abrirChirp(): StreamVoz {
  cliente ??= new v2.SpeechClient({ apiEndpoint: 'us-speech.googleapis.com' });
  return cliente._streamingRecognize() as unknown as StreamVoz;
}

export function crearCanalVoz(o: OpcionesCanal): CanalVoz {
  let stream: StreamVoz | null = null;
  let abiertoEn = 0;
  let silencio: ReturnType<typeof setTimeout> | undefined;

  const cerrar = () => {
    clearTimeout(silencio);
    stream?.end();
    stream = null;
  };

  function abrir(): StreamVoz {
    const s = (o.abrirStream ?? abrirChirp)();
    s.on('data', d => {
      const rs = d.results ?? [];
      const texto = (final: boolean) => rs
        .filter(r => !!r.isFinal === final)
        .map(r => r.alternatives?.[0]?.transcript ?? '')
        .join('')
        .trim();
      const final = texto(true);
      if (final) o.onFinal(final);
      const parcial = texto(false);
      if (parcial) o.onParcial(parcial);
    });
    s.on('error', e => {
      if (stream === s) stream = null;
      o.onError(e);
    });
    s.write(configuracion(o.proyecto, o.frases));
    abiertoEn = Date.now();
    return s;
  }

  return {
    escribir(audio) {
      if (stream && Date.now() - abiertoEn > (o.maxMs ?? 270_000)) cerrar();
      stream ??= abrir();
      stream.write({ audio });
      clearTimeout(silencio);
      silencio = setTimeout(cerrar, o.silencioMs ?? 8_000);
    },
    cerrar,
  };
}
