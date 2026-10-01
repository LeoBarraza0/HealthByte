import type { Alerta, EstadoCirugia, Rango } from './tipos.ts';

export type AlertaActiva = Pick<Alerta, 'id' | 'severidad' | 'mensaje'>;
type Regla = (s: EstadoCirugia) => AlertaActiva[];

const ROL: Record<string, string> = {
  cirujano: 'Cirujano', anestesiologo: 'Anestesiólogo', instrumentador: 'Instrumentador',
  auxiliar_enfermeria: 'Auxiliar de enfermería', perfusionista: 'Perfusionista',
};
const SIN_ALERGIAS = /^(niega|no|ninguna|negativo|\(-\)|-)?$/i;
const verificado = (s: EstadoCirugia, fase: string, item: string) =>
  ['si', 'na'].includes(s.checks[`${fase}.${item}`]?.valor ?? '');

const datoFaltante: Regla = s => s.protocolo.campos_preop
  .filter(c => c.obligatorio && (s.datos[c.id] ?? '') === '')
  .map((c): AlertaActiva => ({ id: `dato:${c.id}`, severidad: 'advertencia', mensaje: `Falta ${c.etiqueta}` }));

const criticoPendiente: Regla = s => s.protocolo.fases
  .filter(f => s.horas[f.abre_con])
  .flatMap(f => f.items
    .filter(i => i.critico && !verificado(s, f.id, i.id))
    .map((i): AlertaActiva => ({
      id: `critico:${f.id}.${i.id}`, severidad: 'critica', mensaje: `${i.texto} pendiente (${f.nombre.toLowerCase()})`,
    })));

const faseIncompleta: Regla = s => s.protocolo.fases
  .filter(f => s.horas[f.cierra_antes_de])
  .flatMap((f): AlertaActiva[] => {
    const faltan = f.items.filter(i => !i.critico && !verificado(s, f.id, i.id));
    return faltan.length
      ? [{ id: `fase:${f.id}`, severidad: 'advertencia', mensaje: `${f.nombre}: sin verificar ${faltan.map(i => i.texto.toLowerCase()).join(', ')}` }]
      : [];
  });

const checkNegado: Regla = s => s.protocolo.fases.flatMap(f => f.items
  .filter(i => s.checks[`${f.id}.${i.id}`]?.valor === 'no')
  .map((i): AlertaActiva => ({ id: `negado:${f.id}.${i.id}`, severidad: 'critica', mensaje: `${i.texto}: no coincide con lo programado` })));

const alergiaSinValidar: Regla = s => {
  const alergias = String(s.datos.alergias ?? '').trim();
  const fase = s.protocolo.fases.find(f => f.items.some(i => i.id === 'alergias'));
  if (SIN_ALERGIAS.test(alergias) || !fase || !s.horas[fase.abre_con] || verificado(s, fase.id, 'alergias')) return [];
  return [{ id: 'alergia', severidad: 'critica', mensaje: `Alergia a ${alergias} sin validar` }];
};

const conteoDescuadrado: Regla = s => !s.horas.fin_cirugia ? [] : Object.entries(s.conteo)
  .filter(([, c]) => c.entra !== c.sale)
  .map(([m, c]): AlertaActiva => ({ id: `conteo:${m}`, severidad: 'critica', mensaje: `${m}: entraron ${c.entra}, salieron ${c.sale}` }));

const equipoDistinto: Regla = s => {
  if (!s.horas.ingreso) return [];
  const programados = Object.entries(s.cirugia.equipo_programado);
  const faltan = programados
    .filter(([, p]) => p && !s.presentes.includes(p.id))
    .map(([rol, p]): AlertaActiva => ({
      id: `equipo:${rol}`, severidad: 'advertencia', mensaje: `${p!.nombre} (${ROL[rol] ?? rol}) programado y no marcado presente`,
    }));
  const ids = new Set(programados.map(([, p]) => p?.id));
  const extra = s.presentes
    .filter(id => !ids.has(id))
    .map((id): AlertaActiva => ({ id: `extra:${id}`, severidad: 'advertencia', mensaje: 'Integrante presente que no estaba programado' }));
  return [...faltan, ...extra];
};

const BETALACTAMICOS = /cefazolin|cefalotin|cefuroxim|ceftriaxon|ampicilin|amoxicilin|penicilin|piperacilin/i;
const ALERGIA_A_PENICILINA = /penicilin|betalact/i;

// Último valor de cada variable con rango: la medición más reciente o, si no hay, el dato preoperatorio.
const fueraDeRango: Regla = s => {
  const variables = new Map<string, { etiqueta: string; unidad: string; rango: Rango }>();
  for (const c of s.protocolo.campos_preop) if (c.rango) variables.set(c.id, { etiqueta: c.etiqueta, unidad: c.unidad ?? '', rango: c.rango });
  for (const m of s.protocolo.mediciones) if (m.rango) variables.set(m.id, { etiqueta: m.etiqueta, unidad: m.unidad, rango: m.rango });
  return [...variables].flatMap(([id, v]): AlertaActiva[] => {
    const ultima = s.eventos.findLast(e => e.datos.tipo === 'medicion' && e.datos.medicion === id);
    const valor = ultima?.datos.tipo === 'medicion' ? ultima.datos.valor : s.datos[id];
    if (typeof valor !== 'number' || (valor >= v.rango.min && valor <= v.rango.max)) return [];
    return [{ id: `rango:${id}`, severidad: 'critica', mensaje: `${v.etiqueta} fuera de rango: ${valor} ${v.unidad}`.trim() }];
  });
};

// La hora del check es cuándo se verificó, no cuándo se aplicó: es una aproximación conservadora.
const antibioticoFueraDeVentana: Regla = s => {
  const c = s.checks['antes_incision.antibiotico'];
  const incision = s.horas.inicio_cirugia;
  if (c?.valor !== 'si' || !incision) return [];
  const minutos = Math.round((Date.parse(incision) - Date.parse(c.ts)) / 60_000);
  return minutos > 60
    ? [{ id: 'antibiotico_ventana', severidad: 'advertencia', mensaje: `Antibiótico verificado ${minutos} min antes de la incisión: evaluar dosis de refuerzo` }]
    : [];
};

const betalactamicoConAlergia: Regla = s => {
  if (!ALERGIA_A_PENICILINA.test(String(s.datos.alergias ?? ''))) return [];
  const dictado = s.eventos.some(e => e.datos.tipo === 'check' && e.datos.item === 'antibiotico' && BETALACTAMICOS.test(e.texto ?? ''));
  return dictado ? [{ id: 'betalactamico', severidad: 'critica', mensaje: 'Alergia a penicilina y betalactámico dictado: confirme compatibilidad' }] : [];
};

const REGLAS: Regla[] = [
  datoFaltante, criticoPendiente, faseIncompleta, checkNegado, alergiaSinValidar, conteoDescuadrado, equipoDistinto,
  fueraDeRango, antibioticoFueraDeVentana, betalactamicoConAlergia,
];

export function alertasActivas(s: EstadoCirugia): AlertaActiva[] {
  return REGLAS.flatMap(r => r(s));
}
