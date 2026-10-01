import type { CampoPreop, Fase, Protocolo } from './tipos.ts';

const CAMPOS_BASE: CampoPreop[] = [
  { id: 'peso', etiqueta: 'Peso', tipo: 'numero', unidad: 'kg', obligatorio: true },
  { id: 'talla', etiqueta: 'Talla', tipo: 'numero', unidad: 'cm', obligatorio: true },
  { id: 'alergias', etiqueta: 'Alergias', tipo: 'texto', obligatorio: true },
  { id: 'grupo_sanguineo', etiqueta: 'Sangre Grupo', tipo: 'texto', obligatorio: true },
  { id: 'rh', etiqueta: 'RH', tipo: 'texto', obligatorio: true },
  { id: 'tipo_anestesia', etiqueta: 'Tipo de Anestesia', tipo: 'texto', obligatorio: true },
  { id: 'comorbilidades', etiqueta: 'Comorbilidades Asociadas', tipo: 'texto', obligatorio: false },
  { id: 'condiciones_especiales', etiqueta: 'Condiciones Especiales', tipo: 'texto', obligatorio: false },
  { id: 'aislamiento', etiqueta: 'Aislamiento', tipo: 'texto', obligatorio: false },
];

const FASES: Fase[] = [
  {
    id: 'antes_anestesia', nombre: 'Antes de la anestesia', abre_con: 'ingreso', cierra_antes_de: 'anestesia',
    items: [
      { id: 'identidad', texto: 'Identidad del paciente', rol: 'anestesiologo', critico: true },
      { id: 'procedimiento', texto: 'Procedimiento', rol: 'cirujano', critico: true },
      { id: 'sitio', texto: 'Sitio quirúrgico y lateralidad', rol: 'cirujano', critico: true },
      { id: 'alergias', texto: 'Alergias', rol: 'anestesiologo' },
      { id: 'riesgos', texto: 'Riesgos relevantes', rol: 'anestesiologo' },
      { id: 'via_aerea', texto: 'Vía aérea difícil o riesgo de aspiración', rol: 'anestesiologo' },
      { id: 'sangrado', texto: 'Riesgo de sangrado mayor a 500 ml', rol: 'anestesiologo' },
      { id: 'equipamiento', texto: 'Equipamiento disponible', rol: 'instrumentador' },
    ],
  },
  {
    id: 'antes_incision', nombre: 'Antes de la incisión', abre_con: 'anestesia', cierra_antes_de: 'inicio_cirugia',
    items: [
      { id: 'confirma_paciente', texto: 'Confirmación del paciente', rol: 'cirujano' },
      { id: 'confirma_procedimiento', texto: 'Confirmación del procedimiento', rol: 'cirujano' },
      { id: 'confirma_sitio', texto: 'Confirmación del sitio y la lateralidad', rol: 'cirujano' },
      { id: 'equipo', texto: 'Identificación del equipo quirúrgico', rol: 'auxiliar_enfermeria' },
      { id: 'esterilizacion', texto: 'Indicadores de esterilización del instrumental', rol: 'instrumentador', critico: true },
      { id: 'antibiotico', texto: 'Antibiótico profiláctico', rol: 'anestesiologo', critico: true },
      { id: 'riesgos_previstos', texto: 'Riesgos previstos', rol: 'cirujano' },
    ],
  },
  {
    id: 'antes_salida', nombre: 'Antes de salir del quirófano', abre_con: 'fin_cirugia', cierra_antes_de: 'salida_recuperacion',
    items: [
      { id: 'recuento_instrumental', texto: 'Recuento de instrumental', rol: 'instrumentador', critico: true },
      { id: 'recuento_material', texto: 'Recuento de gasas y material', rol: 'instrumentador', critico: true },
      { id: 'muestras', texto: 'Identificación de muestras', rol: 'auxiliar_enfermeria' },
      { id: 'novedades', texto: 'Registro de novedades', rol: 'auxiliar_enfermeria' },
      { id: 'procedimiento_realizado', texto: 'Procedimiento realizado', rol: 'cirujano' },
    ],
  },
];

const MATERIALES = [
  'Compresas', 'Gasas', 'Cotonoides', 'Rollos Abdominales', 'Mechas',
  'Hiladillos', 'Agujas Hipodérmicas', 'Agujas Sutura', 'Hojas de Bisturí', 'Drenes',
];

const GLUCOMETRIA = { id: 'glucometria', etiqueta: 'Glucometría', unidad: 'mg/dl', rango: { min: 70, max: 250 } };

export const PROTOCOLO_CARDIO: Protocolo = {
  especialidad: 'Cardiovascular',
  campos_preop: [
    ...CAMPOS_BASE,
    { id: 'reserva_sangre', etiqueta: 'Reserva de Sangre y Cantidad', tipo: 'texto', obligatorio: true },
    { id: 'glucometria', etiqueta: 'Glucometría', tipo: 'numero', unidad: 'mg/dl', obligatorio: true, rango: { min: 70, max: 250 } },
  ],
  fases: FASES,
  materiales: MATERIALES,
  hitos: ['Heparina', 'Entrada a bomba', 'Salida de bomba', 'Clamp aórtico', 'Retiro de clamp', 'Cardioplejía'],
  mediciones: [GLUCOMETRIA, { id: 'diuresis', etiqueta: 'Diuresis', unidad: 'cc' }],
  duraciones: [
    { nombre: 'Tiempo de bomba', desde: 'Entrada a bomba', hasta: 'Salida de bomba' },
    { nombre: 'Tiempo de clamp', desde: 'Clamp aórtico', hasta: 'Retiro de clamp' },
  ],
};

export const PROTOCOLO_GENERAL: Protocolo = {
  especialidad: 'Cirugía general',
  campos_preop: CAMPOS_BASE,
  fases: FASES,
  materiales: MATERIALES,
  hitos: ['Neumoperitoneo', 'Extracción de pieza', 'Cierre de aponeurosis'],
  mediciones: [GLUCOMETRIA],
  duraciones: [],
};

/** Variante con un ítem extra: muestra que cada clínica configura su protocolo sin código. */
export function conMarcacion(p: Protocolo): Protocolo {
  return {
    ...p,
    fases: p.fases.map(f => f.id !== 'antes_anestesia' ? f : {
      ...f,
      items: [...f.items, { id: 'marcacion', texto: 'Marcación del sitio quirúrgico', rol: 'cirujano', critico: true }],
    }),
  };
}

/** Frases para la adaptación de Chirp 3 (máximo 1.000). */
export function vocabulario(p: Protocolo): string[] {
  return [...new Set([
    ...p.materiales, ...p.hitos, ...p.mediciones.map(m => m.etiqueta), ...p.campos_preop.map(c => c.etiqueta),
    ...p.fases.flatMap(f => [f.nombre, ...f.items.map(i => i.texto)]),
    'paciente en sala', 'inicio de anestesia', 'inicio de cirugía', 'fin de cirugía', 'salida a recuperación',
    'entran', 'salen', 'confirmo', 'deshacer', 'novedad', 'cefazolina',
  ])].slice(0, 1000);
}
