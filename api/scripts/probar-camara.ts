import { readFile } from 'node:fs/promises';
import { crearVision } from '../src/vision.ts';
import { PROTOCOLO_CARDIO } from '../src/protocolos.ts';
import type { ModoCamara } from '../src/tipos.ts';

const [archivo, modo = 'conteo'] = process.argv.slice(2);
if (!archivo || (modo !== 'conteo' && modo !== 'esterilizacion')) {
  console.error('Uso: npm run probar-camara -- foto.jpg [conteo|esterilizacion]   (JPEG de la mesa o del indicador)');
  process.exit(1);
}
const proyecto = process.env.GOOGLE_CLOUD_PROJECT;
if (!proyecto) throw new Error('Falta GOOGLE_CLOUD_PROJECT en api/.env');

const analizar = crearVision({ proyecto, modelo: process.env.VISION_MODELO });
const inicio = Date.now();
const r = await analizar(await readFile(archivo), modo as ModoCamara, PROTOCOLO_CARDIO.materiales);
console.log(`${Date.now() - inicio} ms con ${process.env.VISION_MODELO || 'gemini-3.8-flash'}`);
console.log(JSON.stringify(modo === 'conteo' ? { conteo: r.conteo, objetos: r.detecciones.length, nota: r.nota } : r.indicador, null, 2));
