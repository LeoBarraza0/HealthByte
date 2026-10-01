import type { Alerta, Cirugia, EstadoCirugia, Evento, Protocolo } from './tipos.ts';
import { alertasActivas } from './alertas.ts';

export function vigentes(eventos: Evento[]): Evento[] {
  const anulados = new Set(eventos.flatMap(e => (e.datos.tipo === 'anulacion' ? [e.datos.evento_id] : [])));
  return eventos.filter(e => e.datos.tipo !== 'anulacion' && !anulados.has(e.id));
}

function vacio(cirugia: Cirugia, protocolo: Protocolo): EstadoCirugia {
  return {
    cirugia, protocolo, horas: {}, presentes: [], checks: {}, fase_actual: null,
    conteo: Object.fromEntries(protocolo.materiales.map(m => [m, { entra: 0, sale: 0 }])),
    datos: { ...cirugia.datos_preop }, novedades: [], duraciones: [], alertas: [], acciones_conteo: [], eventos: [],
  };
}

function faseActual(s: EstadoCirugia): string | null {
  return s.protocolo.fases.filter(f => s.horas[f.abre_con] && !s.horas[f.cierra_antes_de]).at(-1)?.id ?? null;
}

function aplicar(s: EstadoCirugia, e: Evento): void {
  s.eventos.push(e);
  const d = e.datos;
  switch (d.tipo) {
    case 'hora': s.horas[d.hora] ??= e.ts; break;
    case 'presente': if (!s.presentes.includes(d.usuario_id)) s.presentes.push(d.usuario_id); break;
    case 'check': s.checks[`${d.fase}.${d.item}`] = { valor: d.valor, ts: e.ts, rol: e.rol_confirma }; break;
    case 'conteo': {
      const c = (s.conteo[d.material] ??= { entra: 0, sale: 0 });
      if (d.cantidad > 0) c.entra += d.cantidad; else c.sale -= d.cantidad;
      break;
    }
    case 'dato': s.datos[d.campo] = d.valor; break;
    case 'medicion':
      if (s.protocolo.campos_preop.some(c => c.id === d.medicion) && (s.datos[d.medicion] ?? '') === '') s.datos[d.medicion] = d.valor;
      break;
    case 'novedad':
      s.novedades.push({ id: e.id, texto: d.texto, ts: e.ts, estado: 'detectada', responsable: null, acciones: null, solucionada_ts: null });
      break;
    case 'accion_conteo': s.acciones_conteo.push({ accion: d.accion, ts: e.ts }); break;
    case 'novedad_atendida': {
      const n = s.novedades.find(x => x.id === d.novedad_id);
      if (n?.estado === 'detectada') { n.estado = 'atendida'; n.responsable = d.responsable; }
      break;
    }
    case 'novedad_solucionada': {
      const n = s.novedades.find(x => x.id === d.novedad_id);
      if (n) { n.estado = 'solucionada'; n.acciones = d.acciones; n.solucionada_ts = e.ts; }
      break;
    }
  }
  s.fase_actual = faseActual(s);
}

function duraciones(s: EstadoCirugia): EstadoCirugia['duraciones'] {
  const cuando = (hito: string) => s.eventos.find(e => e.datos.tipo === 'hito' && e.datos.hito === hito)?.ts;
  return s.protocolo.duraciones.map(d => {
    const a = cuando(d.desde);
    const b = cuando(d.hasta);
    return { nombre: d.nombre, minutos: a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 60_000) : null };
  });
}

// ponytail: recalcula todas las reglas en cada evento, O(eventos × reglas); sobra para ~100 eventos por cirugía.
function actualizarAlertas(s: EstadoCirugia, historial: Map<string, Alerta>, ts: string, e?: Evento): void {
  if (e?.datos.tipo === 'alerta_cierre') {
    const a = historial.get(e.datos.alerta);
    if (a?.estado === 'abierta') { a.estado = 'cerrada'; a.motivo = e.datos.motivo; a.hasta = ts; }
  }
  const activas = alertasActivas(s);
  for (const a of activas) {
    const h = historial.get(a.id);
    if (!h) historial.set(a.id, { ...a, estado: 'abierta', desde: ts, hasta: null, motivo: null });
    else if (h.estado !== 'cerrada') Object.assign(h, { mensaje: a.mensaje, severidad: a.severidad, estado: 'abierta', hasta: null });
  }
  const ids = new Set(activas.map(a => a.id));
  for (const h of historial.values()) if (h.estado === 'abierta' && !ids.has(h.id)) { h.estado = 'resuelta'; h.hasta = ts; }
}

export function derivar(cirugia: Cirugia, protocolo: Protocolo, eventos: Evento[]): EstadoCirugia {
  const s = vacio(cirugia, protocolo);
  const historial = new Map<string, Alerta>();
  actualizarAlertas(s, historial, cirugia.fecha_programada);
  for (const e of vigentes(eventos)) {
    aplicar(s, e);
    actualizarAlertas(s, historial, e.ts, e);
  }
  s.duraciones = duraciones(s);
  s.alertas = [...historial.values()];
  return s;
}
