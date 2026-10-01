import { aInt16, crearAcumulador, crearVad, rms } from './pcm.ts';

/** Captura el micrófono a 16 kHz y envía PCM solo mientras alguien habla. Devuelve la función para apagarlo. */
export async function iniciarMicrofono(
  enviar: (pcm: Int16Array) => void,
  umbral: () => number,
  alNivel: (nivel: number) => void,
): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const ctx = new AudioContext({ sampleRate: 16000 });
  await ctx.audioWorklet.addModule('/pcm-worklet.js');
  const nodo = new AudioWorkletNode(ctx, 'captura-pcm');
  const acumular = crearAcumulador(1600); // 100 ms
  const vad = crearVad({ umbral, colgadoMs: 1200, previosBloques: 3 });
  nodo.port.onmessage = (e: MessageEvent<Float32Array>) => {
    for (const bloque of acumular(e.data)) {
      alNivel(rms(bloque));
      for (const b of vad.procesar(bloque, performance.now())) enviar(aInt16(b));
    }
  };
  ctx.createMediaStreamSource(stream).connect(nodo);
  nodo.connect(ctx.destination); // el nodo no produce sonido; conectarlo asegura que Chrome lo procese
  return () => {
    nodo.disconnect();
    stream.getTracks().forEach(t => t.stop());
    void ctx.close();
  };
}
