import type { Sesion as Usuario } from '../../api/src/tipos.ts';

// Esqueleto del orquestador: lo construye el carril G de la ola 3 (docs/agentes/ola-3.md).
export function Trazabilidad(_: { cirugiaId: string; yo: Usuario }) {
  return null;
}
