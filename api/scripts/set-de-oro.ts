import { readFile } from 'node:fs/promises';
import { crearJev, type PreguntarFn, type Respuesta } from '../src/jev.ts';
import { interpretar } from '../src/interprete.ts';
import { derivar } from '../src/estado.ts';
import { PROTOCOLO_CARDIO } from '../src/protocolos.ts';
import { cirugiaPrueba, ev } from '../src/prueba.ts';
import { INSUMOS } from '../src/insumos.ts';
import { INSTRUMENTOS } from '../src/instrumentos.ts';
import { corregir } from '../src/correccion.ts';
import type { HoraId } from '../src/tipos.ts';

interface Caso { frase: string; despues_de: HoraId[]; espera: string }
const casos: Caso[] = JSON.parse(await readFile(new URL('./frases-oro.json', import.meta.url), 'utf8'));
if (!process.env.JEV_API_KEY) throw new Error('Falta JEV_API_KEY en api/.env');

const jev = crearJev(process.env.JEV_API_KEY);
let ultimas: Record<string, Respuesta> = {};
const capturar: PreguntarFn = async (state, q) => (ultimas = await jev(state, q));
const cuenta = { bien: 0, confirma: 0, mal: 0 };

for (const c of casos) {
  const s = derivar(cirugiaPrueba(), PROTOCOLO_CARDIO, c.despues_de.map((hora, i) => ev({ tipo: 'hora', hora }, i)));
  // Igual que la sesión real: catálogos de la clínica y corrección del instrumental antes de Jev.
  s.insumos = INSUMOS;
  s.instrumentos = INSTRUMENTOS;
  const t0 = performance.now();
  const d = await interpretar(corregir(c.frase, INSTRUMENTOS.map(i => i.nombre)), s, false, capturar);
  const ms = Math.round(performance.now() - t0);
  const obtenido = d.accion === 'registrar' || d.accion === 'confirmar' ? d.eventos[0].tipo : d.accion;
  const resultado = obtenido !== c.espera ? 'mal' : d.accion === 'confirmar' ? 'confirma' : 'bien';
  cuenta[resultado]++;
  const dirigida = ultimas.dirigida?.type === 'noul' ? ultimas.dirigida.noul.toFixed(2) : '?';
  const intencion = ultimas.intencion?.type === 'choice' ? `${ultimas.intencion.choice} ${ultimas.intencion.confidence.toFixed(2)}` : '?';
  console.log(`${resultado.padEnd(8)} ${String(ms).padStart(4)} ms  dirigida ${dirigida}  intención ${intencion.padEnd(16)} «${c.frase}» → ${obtenido} (esperado ${c.espera})`);
}
console.log(`\nBien: ${cuenta.bien} · Pide confirmación: ${cuenta.confirma} · Mal: ${cuenta.mal} · Total: ${casos.length}`);
