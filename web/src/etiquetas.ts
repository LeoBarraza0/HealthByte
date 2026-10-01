import type { DatosEvento, HoraId, Protocolo, Rol } from '../../api/src/tipos.ts';

export const HORAS: [HoraId, string][] = [
  ['ingreso', 'Ingreso'], ['anestesia', 'Anestesia'], ['inicio_cirugia', 'Inicio cirugía'],
  ['fin_cirugia', 'Fin cirugía'], ['salida_recuperacion', 'Salida a recuperación'],
];

export const ROLES: Record<Rol, string> = {
  cirujano: 'Cirujano', anestesiologo: 'Anestesiólogo', instrumentador: 'Instrumentador',
  auxiliar_enfermeria: 'Auxiliar de enfermería', perfusionista: 'Perfusionista', coordinador: 'Coordinación', admin: 'Administración',
};

export function hora(ts?: string | null): string {
  return ts
    ? new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })
    : '—';
}

export function describir(d: DatosEvento, p: Protocolo): string {
  switch (d.tipo) {
    case 'hora': return HORAS.find(([id]) => id === d.hora)?.[1] ?? d.hora;
    case 'presente': return 'Integrante presente';
    case 'check': {
      const item = p.fases.flatMap(f => f.items).find(i => i.id === d.item);
      return `${item?.texto ?? d.item}: ${d.valor === 'si' ? '✓' : d.valor === 'no' ? '✗ no coincide' : 'no aplica'}`;
    }
    case 'conteo': return `${d.material} ${d.cantidad > 0 ? '+' : ''}${d.cantidad}`;
    case 'hito': return d.hito;
    case 'medicion': {
      const m = p.mediciones.find(x => x.id === d.medicion);
      return `${m?.etiqueta ?? d.medicion}: ${d.valor} ${m?.unidad ?? ''}`;
    }
    case 'dato': {
      const c = p.campos_preop.find(x => x.id === d.campo);
      return `${c?.etiqueta ?? d.campo}: ${d.valor} ${c?.unidad ?? ''}`;
    }
    case 'novedad': return `Novedad: ${d.texto}`;
    case 'novedad_atendida': return `Novedad atendida: ${d.responsable}`;
    case 'novedad_solucionada': return `Novedad solucionada: ${d.acciones}`;
    case 'alerta_cierre': return `Alerta cerrada: ${d.motivo}`;
    case 'accion_conteo': return {
      cirujano_avisado: 'Cirujano avisado del conteo',
      busqueda_en_campo: 'Búsqueda en campo y cubetas',
      rx_solicitada: 'Rx intraoperatoria solicitada',
    }[d.accion];
    case 'anulacion': return 'Anulación';
  }
}

// Preferencias del dispositivo. El almacenamiento puede no existir (modo privado): nunca debe romper la app.
export function preferencia(clave: string): string | null {
  try { return localStorage.getItem(clave); } catch { return null; }
}
export function guardarPreferencia(clave: string, valor: string): void {
  try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ }
}
