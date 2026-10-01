import type { Captura, Deteccion, EstadoCirugia } from '../../api/src/tipos.ts';

/** Antes de la incisión todo el material está en la mesa; al cierre todo vuelve a ella; durante, parte está en el campo. */
export type MomentoConteo = 'entrada' | 'durante' | 'salida';
export function momentoDelConteo(e: EstadoCirugia): MomentoConteo {
  if (e.horas.fin_cirugia) return 'salida';
  return e.horas.inicio_cirugia ? 'durante' : 'entrada';
}

export const ENCABEZADOS: Record<MomentoConteo, [string, string, string]> = {
  entrada: ['Registrado', 'Cámara', 'Resultado'],
  durante: ['Entró', 'Cámara', ''],
  salida: ['Entró', 'Cámara', 'Resultado'],
};

export interface FilaConteo {
  material: string;
  referencia: number; // lo que debería estar en la mesa: lo que entró
  camara: number | null; // null: todavía no hay foto
  resultado: string;
  tono: 'ok' | 'falta' | 'aviso' | 'neutro';
}

/** La tabla «Conteo de la cámara»: cada material registrado o visto, frente a lo que entró al campo. */
export function filasConteo(e: EstadoCirugia, captura: Captura | null): FilaConteo[] {
  const momento = momentoDelConteo(e);
  const visto = captura?.modo === 'conteo' ? captura.resultado.conteo : null;
  return e.protocolo.materiales
    .filter(m => (e.conteo[m]?.entra ?? 0) > 0 || (visto?.[m] ?? 0) > 0)
    .map((material): FilaConteo => {
      const referencia = e.conteo[material]?.entra ?? 0;
      if (!visto) return { material, referencia, camara: null, resultado: 'Sin foto', tono: 'neutro' };
      const camara = visto[material] ?? 0;
      const diferencia = camara - referencia;
      if (momento === 'durante') return { material, referencia, camara, resultado: 'En la mesa', tono: 'neutro' };
      if (diferencia === 0) return { material, referencia, camara, resultado: momento === 'salida' ? 'Cuadra' : 'Coincide', tono: 'ok' };
      if (momento === 'salida') {
        return diferencia < 0
          ? { material, referencia, camara, resultado: `Falta ${-diferencia}`, tono: 'falta' }
          : { material, referencia, camara, resultado: `Sobran ${diferencia}`, tono: 'aviso' };
      }
      return diferencia > 0
        ? { material, referencia, camara, resultado: `+${diferencia} por registrar`, tono: 'aviso' }
        : { material, referencia, camara, resultado: `${-diferencia} menos en la mesa`, tono: 'aviso' };
    });
}

/** Caja [ymin, xmin, ymax, xmax] de 0 a 1000 como posición CSS sobre la foto. */
export function cajaEnPorcentaje([y0, x0, y1, x1]: Deteccion['caja']) {
  return { top: `${y0 / 10}%`, left: `${x0 / 10}%`, height: `${(y1 - y0) / 10}%`, width: `${(x1 - x0) / 10}%` };
}

export const formatearCodigo = (c: string) => `${c.slice(0, 4)} ${c.slice(4)}`;

const INDICADOR = { viro: 'viró', no_viro: 'no viró', no_visible: 'no se ve' } as const;

export function resumenCaptura(c: Captura): string {
  if (c.modo === 'esterilizacion') {
    const i = c.resultado.indicador;
    return `Indicador ${INDICADOR[i?.estado ?? 'no_visible']}${i?.lote ? ` · lote ${i.lote}` : ''}`;
  }
  const partes = Object.entries(c.resultado.conteo).map(([m, n]) => `${m} ${n}`);
  return partes.join(' · ') || 'Sin material a la vista';
}
