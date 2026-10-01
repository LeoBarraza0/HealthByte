import type { EstadoCirugia, HoraId, Panel } from './tipos.ts';

const ETAPAS: [string, HoraId, HoraId][] = [
  ['Ingreso → anestesia', 'ingreso', 'anestesia'],
  ['Anestesia → incisión', 'anestesia', 'inicio_cirugia'],
  ['Cirugía', 'inicio_cirugia', 'fin_cirugia'],
  ['Fin → salida', 'fin_cirugia', 'salida_recuperacion'],
];

// Alertas que de verdad atraparon un riesgo; se excluyen los pendientes rutinarios del checklist.
const CATEGORIAS: [RegExp, string][] = [
  [/^dato:/, 'Dato del paciente completado'],
  [/^alergia$/, 'Alergia validada'],
  [/^betalactamico$/, 'Compatibilidad de antibiótico confirmada'],
  [/^rango:/, 'Valor clínico fuera de rango atendido'],
  [/^negado:/, 'Discrepancia con lo programado corregida'],
  [/^conteo:/, 'Conteo corregido antes de cerrar'],
];

const minutos = (a?: string | null, b?: string | null) => (a && b ? (Date.parse(b) - Date.parse(a)) / 60_000 : null);
const redondo = (x: number | null) => (x === null ? null : Math.round(x));
const promedio = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
};
const verificado = (s: EstadoCirugia, fase: string, item: string) =>
  ['si', 'na'].includes(s.checks[`${fase}.${item}`]?.valor ?? '');

export function estadoDe(s: EstadoCirugia): Panel['lista'][number]['estado'] {
  if (s.horas.salida_recuperacion) return 'realizada';
  return Object.keys(s.horas).length ? 'en_curso' : 'programada';
}

const checklistCompleta = (s: EstadoCirugia) => s.protocolo.fases.every(f => f.items.every(i => verificado(s, f.id, i.id)));

const cumplioProtocolo = (s: EstadoCirugia) => s.protocolo.fases.every(f => {
  const cierre = s.horas[f.cierra_antes_de];
  return !!cierre && f.items.every(i => {
    const c = s.checks[`${f.id}.${i.id}`];
    return !!c && c.valor !== 'no' && c.ts <= cierre;
  });
});

export function resumir(estados: EstadoCirugia[]): Panel {
  const realizadas = estados.filter(s => estadoDe(s) === 'realizada');
  const completas = realizadas.filter(checklistCompleta).length;
  const alertas = estados.flatMap(s => s.alertas);
  const frecuentes = new Map<string, { mensaje: string; veces: number }>();
  for (const a of alertas.filter(x => x.estado !== 'resuelta')) {
    const f = frecuentes.get(a.id) ?? { mensaje: a.mensaje, veces: 0 };
    f.veces++;
    frecuentes.set(a.id, f);
  }
  const novedades = estados.flatMap(s => s.novedades);
  const nombresDuracion = [...new Set(estados.flatMap(s => s.duraciones.map(d => d.nombre)))];

  return {
    cirugias: {
      programadas: estados.filter(s => estadoDe(s) === 'programada').length,
      en_curso: estados.filter(s => estadoDe(s) === 'en_curso').length,
      realizadas: realizadas.length,
    },
    checklists: { completas, incompletas: realizadas.length - completas },
    cumplimiento: realizadas.length ? Math.round((1000 * realizadas.filter(cumplioProtocolo).length) / realizadas.length) / 10 : null,
    alertas: {
      abiertas: alertas.filter(a => a.estado === 'abierta').length,
      resueltas: alertas.filter(a => a.estado === 'resuelta').length,
      cerradas: alertas.filter(a => a.estado === 'cerrada').length,
      frecuentes: [...frecuentes.values()].sort((a, b) => b.veces - a.veces).slice(0, 5),
    },
    atrapados: CATEGORIAS
      .map(([re, categoria]) => ({ categoria, veces: alertas.filter(a => a.estado === 'resuelta' && re.test(a.id)).length }))
      .filter(x => x.veces > 0),
    tiempos: ETAPAS.map(([etapa, a, b]) => ({ etapa, minutos: promedio(realizadas.map(s => minutos(s.horas[a], s.horas[b]))) })),
    novedades: {
      abiertas: novedades.filter(n => n.estado !== 'solucionada').length,
      solucionadas: novedades.filter(n => n.estado === 'solucionada').length,
      minutos_solucion: promedio(novedades.map(n => minutos(n.ts, n.solucionada_ts))),
    },
    duraciones: nombresDuracion.map(nombre => ({
      nombre, minutos: promedio(estados.map(s => s.duraciones.find(d => d.nombre === nombre)?.minutos ?? null)),
    })),
    lista: estados
      .map(s => ({
        id: s.cirugia.id, fecha: s.cirugia.fecha_programada, quirofano: s.cirugia.quirofano,
        paciente: s.cirugia.paciente.nombre, procedimiento: s.cirugia.procedimiento,
        especialidad: s.protocolo.especialidad, estado: estadoDe(s),
        alertas_abiertas: s.alertas.filter(a => a.estado === 'abierta').length,
        alertas_cerradas: s.alertas.filter(a => a.estado === 'cerrada').length,
        alertas_resueltas: s.alertas.filter(a => a.estado === 'resuelta').length,
        protocolo_cumplido: cumplioProtocolo(s),
        minutos: redondo(minutos(s.horas.ingreso, s.horas.salida_recuperacion)),
      }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
  };
}
