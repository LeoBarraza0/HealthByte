import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { configuracion, crearCanalVoz } from './voz.ts';

class StreamFalso extends EventEmitter {
  escritos: unknown[] = [];
  terminado = false;
  write(x: unknown) { this.escritos.push(x); }
  end() { this.terminado = true; }
}

function montar(extra: { silencioMs?: number; maxMs?: number } = {}) {
  const streams: StreamFalso[] = [];
  const parciales: string[] = [];
  const finales: string[] = [];
  const errores: Error[] = [];
  const canal = crearCanalVoz({
    proyecto: 'p', frases: ['Compresas'],
    onParcial: t => parciales.push(t), onFinal: t => finales.push(t), onError: e => errores.push(e),
    abrirStream: () => { const s = new StreamFalso(); streams.push(s); return s; },
    ...extra,
  });
  return { canal, streams, parciales, finales, errores };
}

test('abre el stream con la configuración y luego envía el audio', () => {
  const { canal, streams } = montar();
  assert.equal(streams.length, 0);
  canal.escribir(Buffer.from([1, 2]));
  assert.equal(streams.length, 1);
  const config = streams[0].escritos[0] as { recognizer: string; streamingConfig: { config: { model: string; languageCodes: string[] } } };
  assert.equal(config.recognizer, 'projects/p/locations/us/recognizers/_');
  assert.equal(config.streamingConfig.config.model, 'chirp_3');
  assert.deepEqual(config.streamingConfig.config.languageCodes, ['es-US']);
  assert.deepEqual(streams[0].escritos[0], {
    recognizer: 'projects/p/locations/us/recognizers/_',
    streamingConfig: {
      config: {
        model: 'chirp_3', languageCodes: ['es-US'],
        explicitDecodingConfig: { encoding: 'LINEAR16', sampleRateHertz: 16000, audioChannelCount: 1 },
        features: { enableAutomaticPunctuation: true },
        adaptation: { phraseSets: [{ inlinePhraseSet: { phrases: [{ value: 'Compresas' }] } }] },
        denoiserConfig: { denoiseAudio: true },
      },
      streamingFeatures: { interimResults: true },
    },
  });
  assert.deepEqual(streams[0].escritos[1], { audio: Buffer.from([1, 2]) });
  canal.cerrar();
});

test('separa resultados parciales y finales', () => {
  const { canal, streams, parciales, finales } = montar();
  canal.escribir(Buffer.from([1]));
  streams[0].emit('data', { results: [{ alternatives: [{ transcript: 'entran diez' }], isFinal: false }] });
  streams[0].emit('data', { results: [{ alternatives: [{ transcript: 'entran diez compresas' }], isFinal: true }] });
  assert.deepEqual(parciales, ['entran diez']);
  assert.deepEqual(finales, ['entran diez compresas']);
  canal.cerrar();
});

test('cierra tras el silencio y reabre con la siguiente voz', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { canal, streams } = montar({ silencioMs: 10 });
  canal.escribir(Buffer.from([1]));
  t.mock.timers.tick(30);
  assert.ok(streams[0].terminado);
  canal.escribir(Buffer.from([2]));
  assert.equal(streams.length, 2);
  canal.cerrar();
});

test('rota el stream al superar la duración máxima', t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });
  const { canal, streams } = montar({ maxMs: 5 });
  canal.escribir(Buffer.from([1]));
  t.mock.timers.tick(10);
  canal.escribir(Buffer.from([2]));
  assert.ok(streams[0].terminado);
  assert.equal(streams.length, 2);
  canal.cerrar();
});

test('limita el vocabulario a las primeras 1000 frases', () => {
  const frases = Array.from({ length: 1001 }, (_, i) => `Frase ${i}`);
  const vocabulario = configuracion('p', frases).streamingConfig.config.adaptation.phraseSets[0].inlinePhraseSet.phrases;
  assert.equal(vocabulario.length, 1000);
  assert.deepEqual(vocabulario[0], { value: 'Frase 0' });
  assert.deepEqual(vocabulario.at(-1), { value: 'Frase 999' });
});

test('el audio reinicia los 8 s de silencio y cerrar cancela el temporizador', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { canal, streams } = montar();
  canal.escribir(Buffer.from([1]));
  t.mock.timers.tick(7000);
  canal.escribir(Buffer.from([2]));
  t.mock.timers.tick(1000);
  assert.equal(streams[0].terminado, false);
  t.mock.timers.tick(7000);
  assert.equal(streams[0].terminado, true);
  canal.escribir(Buffer.from([3]));
  canal.cerrar();
  canal.cerrar();
  t.mock.timers.tick(8000);
  assert.equal(streams.length, 2);
  assert.equal(streams[1].terminado, true);
});

test('si el stream falla, avisa y se reabre en la siguiente escritura', () => {
  const { canal, streams, errores } = montar();
  canal.escribir(Buffer.from([1]));
  streams[0].emit('error', new Error('corte'));
  assert.equal(errores.length, 1);
  canal.escribir(Buffer.from([2]));
  assert.equal(streams.length, 2);
  canal.cerrar();
});
