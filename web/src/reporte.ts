import type { EstadoCirugia, Evento } from '../../api/src/tipos.ts';

// Arma el «Control de consumos de cirugía» con las secciones de la planilla en papel (research/Control_consumos_cirugia.md).

export interface FilaReporte { elemento: string; consumo: string; total: number; del_conteo: boolean }
export interface Reporte {
  generales: FilaReporte[];
  con_codigo: FilaReporte[];
  suturas: FilaReporte[];
  otros: FilaReporte[];
  equipos: { grupo: string; items: { nombre: string; marcado: boolean }[] }[];
  elementos: number;
  unidades: number;
}

// La planilla separa estos insumos en «Insumos con código».
const CON_CODIGO = new Set(['Hemoclip amarillo', 'Hemoclip azul', 'Hem-o-lok', 'Ligaclip LT 300', 'Paquete artroscopia', 'Paquete desechable']);

// ponytail: los grupos de equipos copian los de la planilla; si la clínica agrega un equipo nuevo, cae en «Otros».
const GRUPOS_EQUIPO: [string, string[]][] = [
  ['Cirugía general', ['Detector de ganglio centinela', 'Fibrobroncoscopio', 'Mediastinoscopio']],
  ['Ginecología', ['Ellman', 'Histeroscopio', 'Morcelador', 'Versapoint', 'Video ligadura de trompas', 'Video histerectomía']],
  ['Ortopedia', ['Instrumental de artroscopia', 'Intensificador de imagen', 'Motor de ortopedia', 'Shaver', 'Video artroscopia']],
  ['Neurocirugía', ['Microscopio', 'Motor de neuro']],
  ['Otorrino', ['Motor de oído']],
  ['Urología', ['Equipo de urología', 'Litoclast']],
  ['Otros', []],
];

const ORIGEN = { voz: 'Voz', manual: 'Toque', camara: 'Cámara' } as const;

/** «Voz 2 + 4 · Toque 2»: cada registro de consumo, agrupado por cómo se hizo. */
function comoSeRegistro(eventos: Evento[], insumo: string): string {
  const porOrigen = new Map<Evento['origen'], number[]>();
  for (const e of eventos) {
    if (e.datos.tipo !== 'consumo' || e.datos.insumo !== insumo) continue;
    porOrigen.set(e.origen, [...(porOrigen.get(e.origen) ?? []), e.datos.cantidad]);
  }
  return [...porOrigen]
    .map(([origen, cantidades]) => `${ORIGEN[origen]} ${cantidades.map(n => (n < 0 ? `−${-n}` : String(n))).join(' + ')}`)
    .join(' · ');
}

export function armarReporte(estado: EstadoCirugia): Reporte {
  const totales = new Map(estado.consumo.filter(l => !l.del_conteo).map(l => [l.insumo, l.cantidad]));
  const fila = (elemento: string): FilaReporte => {
    const total = totales.get(elemento) ?? 0;
    return { elemento, total, consumo: total ? comoSeRegistro(estado.eventos, elemento) : '', del_conteo: false };
  };
  const deCategoria = (categoria: string) => estado.insumos.filter(i => i.categoria === categoria).map(i => i.nombre);
  const enCatalogo = new Set(estado.insumos.map(i => i.nombre));

  const otros = [
    ...deCategoria('otro').map(fila),
    // Lo registrado que no está en el catálogo, y lo que entró al campo en el conteo.
    ...estado.consumo.filter(l => !l.del_conteo && !enCatalogo.has(l.insumo)).map(l => fila(l.insumo)),
    ...estado.consumo.filter(l => l.del_conteo).map(l => ({ elemento: l.insumo, total: l.cantidad, consumo: 'Conteo', del_conteo: true })),
  ];

  const equiposCatalogo = deCategoria('equipo');
  const agrupados = new Set(GRUPOS_EQUIPO.flatMap(([, nombres]) => nombres));
  const equipos = GRUPOS_EQUIPO.map(([grupo, nombres]) => {
    const lista = grupo === 'Otros' ? equiposCatalogo.filter(n => !agrupados.has(n)) : nombres.filter(n => equiposCatalogo.includes(n));
    return { grupo, items: lista.map(nombre => ({ nombre, marcado: (totales.get(nombre) ?? 0) > 0 })) };
  }).filter(g => g.items.length > 0);

  return {
    generales: deCategoria('general').filter(n => !CON_CODIGO.has(n)).map(fila),
    con_codigo: deCategoria('general').filter(n => CON_CODIGO.has(n)).map(fila),
    suturas: deCategoria('sutura').map(fila),
    otros,
    equipos,
    elementos: estado.consumo.length,
    unidades: estado.consumo.reduce((a, l) => a + l.cantidad, 0),
  };
}
