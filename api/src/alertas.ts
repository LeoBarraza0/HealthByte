import type { Alerta, EstadoCirugia } from './tipos.ts';

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

const REGLAS: Regla[] = [datoFaltante, criticoPendiente, faseIncompleta, checkNegado, alergiaSinValidar, conteoDescuadrado, equipoDistinto];

export function alertasActivas(s: EstadoCirugia): AlertaActiva[] {
  return REGLAS.flatMap(r => r(s));
}
