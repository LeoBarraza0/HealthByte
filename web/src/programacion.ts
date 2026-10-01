// Funciones puras para la programación de cirugías y la gestión de personal.

/** Convierte una fecha YYYY-MM-DD y hora HH:MM de Colombia (UTC-5) a string ISO UTC. */
export function aIsoBogota(fecha: string, hora: string): string {
  if (!fecha || !hora) return '';
  const [hh = '00', mm = '00'] = hora.trim().split(':');
  const hNorm = `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00`;
  const d = new Date(`${fecha}T${hNorm}-05:00`);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

/** Calcula el desplazamiento superior y la altura en píxeles de un bloque en la agenda. */
export function bloque(
  fechaIso: string,
  duracionMin: number,
  horaInicio = 7,
  pxHora = 80,
): { top: number; alto: number } {
  const d = new Date(fechaIso);
  if (isNaN(d.getTime())) {
    return { top: 2, alto: 0 };
  }
  const bogotaDate = new Date(d.getTime() - 5 * 3600 * 1000);
  const h = bogotaDate.getUTCHours();
  const m = bogotaDate.getUTCMinutes();
  const minutosDesdeInicio = (h - horaInicio) * 60 + m;
  const top = Math.round(minutosDesdeInicio * (pxHora / 60)) + 2;
  const dur = Math.max(0, Number(duracionMin) || 0);
  const alto = Math.max(0, Math.round(dur * (pxHora / 60)) - 4);
  return { top, alto };
}

/** Horas que muestra la agenda: de 06:00 a 20:00, como el formulario, ampliadas para que quepa toda cirugía del día. */
export function rangoAgenda(cirugias: { fecha_programada: string; duracion_min: number }[]): { desde: number; hasta: number } {
  let desde = 6;
  let hasta = 20;
  for (const c of cirugias) {
    const d = new Date(c.fecha_programada);
    if (isNaN(d.getTime())) continue;
    const bogota = new Date(d.getTime() - 5 * 3600 * 1000);
    const inicio = bogota.getUTCHours() + bogota.getUTCMinutes() / 60;
    desde = Math.min(desde, Math.floor(inicio));
    hasta = Math.max(hasta, Math.ceil(inicio + (Number(c.duracion_min) || 0) / 60));
  }
  return { desde, hasta: Math.min(24, hasta) };
}

/** Extrae la hora 'HH:MM' en huso de Colombia (UTC-5) de una fecha ISO. */
export function horaBogota(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const bogotaDate = new Date(d.getTime() - 5 * 3600 * 1000);
  const hh = String(bogotaDate.getUTCHours()).padStart(2, '0');
  const mm = String(bogotaDate.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Devuelve la fecha de hoy en Colombia en formato 'YYYY-MM-DD'. */
export function hoyBogota(ahora: number | Date = Date.now()): string {
  const ts = typeof ahora === 'number' ? ahora : ahora.getTime();
  const bogotaDate = new Date(ts - 5 * 3600 * 1000);
  const yyyy = bogotaDate.getUTCFullYear();
  const mm = String(bogotaDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(bogotaDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Sugiere un nombre de usuario a partir del nombre completo (inicial + primer apellido en minúsculas sin tildes). */
export function sugerirLogin(nombreCompleto: string): string {
  const limpio = nombreCompleto
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (!limpio) return '';
  const partes = limpio
    .split(/\s+/)
    .map(p => p.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
  if (partes.length === 0) return '';
  if (partes.length === 1) return partes[0];
  const inicial = partes[0][0];
  const apellido = partes[1];
  return `${inicial}${apellido}`;
}

const PALABRAS = [
  'mango', 'faro', 'cerro', 'valle', 'brisa', 'coral', 'palma', 'selva',
  'rio', 'luna', 'puma', 'lince', 'nube', 'senda', 'roca', 'costa',
  'bahia', 'delfin', 'viento', 'playa', 'morro', 'ceiba', 'aromo',
];

/** Genera una contraseña legible de al menos 10 caracteres con el formato palabra-palabra-numero. */
export function generarClave(): string {
  const p1 = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
  let p2 = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
  while (p2 === p1) {
    p2 = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
  }
  const num = Math.floor(Math.random() * 90) + 10;
  return `${p1}-${p2}-${num}`;
}
