import type { Cirugia } from './tipos.ts';
import { normalizar } from './numeros.ts';

/** Quita la identidad del paciente del texto que sale hacia servicios externos (Ley 1581 de 2012). */
export function seudonimizar(texto: string, cirugia: Cirugia): string {
  const nombre = new Set(normalizar(cirugia.paciente.nombre).split(/\s+/).filter(p => p.length >= 3));
  return texto
    .replace(/\d[\d.\s-]{4,}\d/g, '[ID]')
    .replace(/\p{L}+/gu, palabra => (nombre.has(normalizar(palabra)) ? '[PACIENTE]' : palabra))
    .replace(/\[PACIENTE\](\s+\[PACIENTE\])+/g, '[PACIENTE]');
}
