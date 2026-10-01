import type { NuevaCirugia, NuevoIntegrante, Rol } from './tipos.ts';

export const ROLES: readonly Rol[] = [
  'cirujano',
  'anestesiologo',
  'instrumentador',
  'auxiliar_enfermeria',
  'perfusionista',
  'coordinador',
  'admin',
];

export function esFechaValida(fecha: unknown): fecha is string {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [y, m, d] = fecha.split('-').map(Number);
  const dt = new Date(`${fecha}T00:00:00Z`);
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d;
}

export function validarNuevaCirugia(_x: unknown): NuevaCirugia | string {
  return 'No implementado';
}

export function validarNuevoIntegrante(_x: unknown): NuevoIntegrante | string {
  return 'No implementado';
}
