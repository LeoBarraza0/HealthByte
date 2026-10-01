// Funciones puras para la programación de cirugías y la gestión de personal.

/** Convierte una fecha YYYY-MM-DD y hora HH:MM de Colombia (UTC-5) a string ISO UTC. */
export function aIsoBogota(fecha: string, hora: string): string {
  const h = hora.length === 5 ? `${hora}:00` : hora;
  return new Date(`${fecha}T${h}-05:00`).toISOString();
}

/** Calcula el desplazamiento superior y la altura en píxeles de un bloque en la agenda. */
export function bloque(
  fechaIso: string,
  duracionMin: number,
  horaInicio = 7,
  pxHora = 80,
): { top: number; alto: number } {
  const bogotaDate = new Date(new Date(fechaIso).getTime() - 5 * 3600 * 1000);
  const h = bogotaDate.getUTCHours();
  const m = bogotaDate.getUTCMinutes();
  const minutosDesdeInicio = (h - horaInicio) * 60 + m;
  const top = Math.round(minutosDesdeInicio * (pxHora / 60)) + 2;
  const alto = Math.max(0, Math.round(duracionMin * (pxHora / 60)) - 4);
  return { top, alto };
}

/** Extrae la hora 'HH:MM' en huso de Colombia (UTC-5) de una fecha ISO. */
export function horaBogota(iso: string): string {
  const bogotaDate = new Date(new Date(iso).getTime() - 5 * 3600 * 1000);
  const hh = String(bogotaDate.getUTCHours()).padStart(2, '0');
  const mm = String(bogotaDate.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Devuelve la fecha de hoy en Colombia en formato 'YYYY-MM-DD'. */
export function hoyBogota(): string {
  const bogotaDate = new Date(Date.now() - 5 * 3600 * 1000);
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
    .replace(/[\u0300-\u036f]/g, '');
  if (!limpio) return '';
  const partes = limpio.split(/\s+/).filter(Boolean);
  if (partes.length === 1) {
    return partes[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  const inicial = partes[0][0].toLowerCase();
  const apellido = partes[1].toLowerCase().replace(/[^a-z0-9]/g, '');
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
