import type { AccionConteo, CategoriaInsumo, EstadoCirugia, Insumo, ItemChecklist } from '../../api/src/tipos.ts';

export function esVerificado(estado: EstadoCirugia, faseId: string, itemId: string): boolean {
  const check = estado.checks[`${faseId}.${itemId}`];
  return check?.valor === 'si' || check?.valor === 'na';
}

/** Devuelve los ítems pendientes de una fase, con los críticos primero. */
export function pendientes(estado: EstadoCirugia, faseId: string): ItemChecklist[] {
  const fase = estado.protocolo.fases.find(f => f.id === faseId);
  if (!fase) return [];
  const noVerificados = fase.items.filter(item => !esVerificado(estado, faseId, item.id));
  return [
    ...noVerificados.filter(i => i.critico),
    ...noVerificados.filter(i => !i.critico),
  ];
}

/** Devuelve los ítems ya verificados de una fase. */
export function verificados(estado: EstadoCirugia, faseId: string): ItemChecklist[] {
  const fase = estado.protocolo.fases.find(f => f.id === faseId);
  if (!fase) return [];
  return fase.items.filter(item => esVerificado(estado, faseId, item.id));
}

export interface InfoPasoConteo {
  accion: AccionConteo;
  numero: number;
  titulo: string;
  boton: string;
  hecho: boolean;
  ts?: string;
}

export const PASOS_CONTEO_DEF: { accion: AccionConteo; numero: number; titulo: string; boton: string; detalle?: string }[] = [
  { accion: 'cirujano_avisado', numero: 1, titulo: 'Avisar a la cirujana', boton: 'Cirujana avisada' },
  { accion: 'busqueda_en_campo', numero: 2, titulo: 'Buscar en campo, cubetas y canecas', boton: 'Marcar búsqueda hecha' },
  { accion: 'rx_solicitada', numero: 3, titulo: 'Solicitar Rx intraoperatoria', boton: 'Rx solicitada', detalle: 'Si el material no aparece, antes de cerrar.' },
];

/** Devuelve los 3 pasos del protocolo de conteo con su estado actual y hora. */
export function pasosConteo(estado: EstadoCirugia): InfoPasoConteo[] {
  return PASOS_CONTEO_DEF.map(p => {
    const accionHecha = estado.acciones_conteo.find(a => a.accion === p.accion);
    return {
      accion: p.accion,
      numero: p.numero,
      titulo: p.titulo,
      boton: p.boton,
      hecho: Boolean(accionHecha),
      ts: accionHecha?.ts,
    };
  });
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const CATEGORIAS_MAP: Record<string, CategoriaInsumo | 'todos'> = {
  todos: 'todos',
  generales: 'general',
  general: 'general',
  suturas: 'sutura',
  sutura: 'sutura',
  otros: 'otro',
  otro: 'otro',
  equipos: 'equipo',
  equipo: 'equipo',
};

/** Busca insumos ignorando tildes y mayúsculas, y filtrando por categoría. */
export function buscarInsumos(insumos: Insumo[], texto: string, categoria: string): Insumo[] {
  const normFiltro = normalizar(texto);
  const catObjetivo = CATEGORIAS_MAP[normalizar(categoria)] ?? 'todos';

  return insumos.filter(insumo => {
    if (catObjetivo !== 'todos' && insumo.categoria !== catObjetivo) {
      return false;
    }
    if (!normFiltro) return true;
    return normalizar(insumo.nombre).includes(normFiltro);
  });
}
