import type { FastifyRequest } from 'fastify';
import { conClinica, pool } from './db.ts';
import { verificarClave } from './clave.ts';
import type { Sesion } from './tipos.ts';

export const COOKIE = 'hb_sesion';

export function leerSesion(req: FastifyRequest): Sesion | null {
  const crudo = req.cookies[COOKIE];
  if (!crudo) return null;
  const firmado = req.unsignCookie(crudo);
  if (!firmado.valid || !firmado.value) return null;
  try {
    return JSON.parse(firmado.value) as Sesion;
  } catch {
    return null;
  }
}

export async function login(slug: string, usuario: string, clave: string): Promise<Sesion | null> {
  // `clinica` no tiene datos sensibles ni RLS: se consulta sin clínica fijada para saber a cuál fijar.
  const { rows: [clinica] } = await pool.query('SELECT id FROM clinica WHERE slug = $1', [slug]);
  if (!clinica) return null;
  const u = await conClinica(clinica.id, async c =>
    (await c.query('SELECT id, nombre, rol, hash_clave FROM usuario WHERE login = $1', [usuario])).rows[0]);
  if (!u || !verificarClave(clave, u.hash_clave)) return null;
  return { usuario_id: u.id, clinica_id: clinica.id, rol: u.rol, nombre: u.nombre };
}
