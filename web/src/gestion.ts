import type { EstadoCirugia } from '../../api/src/tipos.ts';
import { hora } from './etiquetas.ts';

/** CSV para Excel en español: separador «;», comillas solo cuando hace falta y BOM para que respete las tildes. */
export function csv(filas: (string | number)[][]): string {
  const celda = (v: string | number) => {
    const s = String(v);
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + filas.map(f => f.map(celda).join(';')).join('\r\n');
}

/** La hoja de consumo de una cirugía, lista para pasar al proceso de la clínica. */
export function csvConsumo(estado: EstadoCirugia): string {
  const c = estado.cirugia;
  const fecha = new Date(c.fecha_programada).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
  return csv([
    ['Paciente', c.paciente.nombre],
    ['Procedimiento', c.procedimiento],
    ['Fecha', `${fecha} ${hora(c.fecha_programada)}`],
    ['Quirófano', c.quirofano],
    [],
    ['Insumo', 'Cantidad', 'Origen'],
    ...estado.consumo.map(l => [l.insumo, l.cantidad, l.del_conteo ? 'Del conteo' : 'Registrado']),
  ]);
}

/** Descarga un texto como archivo, sin pasar por el servidor. */
export function descargar(nombre: string, contenido: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  a.click();
  URL.revokeObjectURL(url);
}
