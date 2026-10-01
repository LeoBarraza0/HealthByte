import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashClave(clave: string): string {
  const sal = randomBytes(16).toString('hex');
  return `${sal}:${scryptSync(clave, sal, 32).toString('hex')}`;
}

export function verificarClave(clave: string, guardado: string): boolean {
  const [sal, hash, extra] = guardado.split(':');
  if (!sal || !hash || extra !== undefined || !/^[0-9a-f]{64}$/i.test(hash)) return false;
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(clave, sal, 32));
}
