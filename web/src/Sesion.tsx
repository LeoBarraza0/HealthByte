import type { Sesion as Usuario } from '../../api/src/tipos.ts';

// Esqueleto del orquestador: lo construye el carril S1 de la ola 3 (docs/agentes/ola-3.md).
export function Sesion(_: { cirugiaId: string; yo: Usuario }) {
  return null;
}
