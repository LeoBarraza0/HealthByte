import { readFile } from 'node:fs/promises';
import { setTimeout as esperar } from 'node:timers/promises';
import { crearCanalVoz } from '../src/voz.ts';
import { PROTOCOLO_CARDIO, vocabulario } from '../src/protocolos.ts';

const archivo = process.argv[2];
if (!archivo) {
  console.error('Uso: npm run probar-voz -- grabacion.wav   (WAV de 16 kHz, mono, 16 bits)');
  process.exit(1);
}
const proyecto = process.env.GOOGLE_CLOUD_PROJECT;
if (!proyecto) throw new Error('Falta GOOGLE_CLOUD_PROJECT en api/.env');
// ponytail: cabecera WAV PCM estándar de 44 bytes; usar un lector de chunks si la grabación incluye metadatos.
const pcm = (await readFile(archivo)).subarray(44);
const canal = crearCanalVoz({
  proyecto,
  frases: vocabulario(PROTOCOLO_CARDIO),
  onParcial: t => console.log('…', t),
  onFinal: t => console.log('✔', t),
  onError: e => console.error('✖', e.message),
});
for (let i = 0; i < pcm.length; i += 3200) {
  canal.escribir(pcm.subarray(i, i + 3200));
  await esperar(100);
}
await esperar(3000);
canal.cerrar();
await esperar(1000);
process.exit(0);
