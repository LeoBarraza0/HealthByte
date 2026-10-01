import type { EstadoCirugia, HoraId } from '../../api/src/tipos.ts';

/**
 * Da true si apareció una alerta crítica abierta que antes no estaba.
 * Al inicio (antes = null), devuelve false.
 */
export function nuevaCritica(antes: EstadoCirugia | null, ahora: EstadoCirugia): boolean {
  if (!antes) return false;
  const abiertasAntes = new Set(
    antes.alertas.filter(a => a.severidad === 'critica' && a.estado === 'abierta').map(a => a.id),
  );
  return ahora.alertas.some(
    a => a.severidad === 'critica' && a.estado === 'abierta' && !abiertasAntes.has(a.id),
  );
}

/**
 * Da true si hay salida_recuperacion y ninguna alerta abierta.
 */
export function cierreSeguro(estado: EstadoCirugia): boolean {
  return Boolean(estado.horas.salida_recuperacion && !estado.alertas.some(a => a.estado === 'abierta'));
}

/**
 * Normaliza y formatea el texto de la alerta de alergia.
 * Devuelve null si no hay alergia o si dice "ninguna" o "niega".
 */
export function alergiaVisible(alergias: string | number | null | undefined): string | null {
  if (alergias === null || alergias === undefined) return null;
  const texto = String(alergias).trim();
  if (!texto) return null;
  const min = texto.toLowerCase();
  if (min === 'ninguna' || min === 'niega' || min === 'no' || min === 'no refiere') return null;
  if (/^alergia/i.test(texto)) return texto;
  return `Alergia a ${min}`;
}

export const ORDEN_HORAS: readonly HoraId[] = [
  'ingreso',
  'anestesia',
  'inicio_cirugia',
  'fin_cirugia',
  'salida_recuperacion',
];

/**
 * Devuelve la próxima hora sin registrar según el flujo normal, o null si ya están todas registradas.
 */
export function proximaHora(horas: Partial<Record<HoraId, string>>): HoraId | null {
  return ORDEN_HORAS.find(h => !horas[h]) ?? null;
}

/**
 * Calcula los minutos transcurridos en un tramo entre 'desde' y 'hasta' o 'ahoraMs'.
 */
export function tramoMinutos(desde: string | undefined, hasta: string | undefined, ahoraMs: number): number | null {
  if (!desde) return null;
  const inicio = Date.parse(desde);
  if (Number.isNaN(inicio)) return null;
  const fin = hasta ? Date.parse(hasta) : ahoraMs;
  if (Number.isNaN(fin)) return null;
  return Math.max(0, Math.round((fin - inicio) / 60_000));
}

/**
 * Formatea minutos en texto amigable ("X min" o "H h M min" o "H h").
 */
export function formatearMinutos(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined) return '';
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
