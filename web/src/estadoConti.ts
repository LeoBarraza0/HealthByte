import type { FaseVoz } from '../../api/src/tipos.ts';

export type ContiEstado = 'paused' | 'idle' | 'listening' | 'processing' | 'asking' | 'verified' | 'confused' | 'alert' | 'celebrate';

export interface SenalesConti {
  ahora: number;
  microfonoActivo: boolean; // algún dispositivo de la sala tiene el micrófono
  ultimoParcial: number | null;
  pendiente: boolean;
  ultimaVoz: { fase: FaseVoz; en: number } | null;
  ultimaAlertaCritica: number | null; // cuándo se abrió la última alerta crítica nueva
  cierreSeguro: number | null; // cuándo se registró la salida sin alertas abiertas
}

const DURA = { parcial: 1500, procesando: 5000, registrado: 2500, no_entendido: 3000, alerta: 4000, cierre: 4000 };

/** Prioridad de Diseño/conti-estados.md: paused > asking > alert > processing > listening > verified > confused > celebrate > idle. */
export function estadoConti(s: SenalesConti): ContiEstado {
  const reciente = (t: number | null, ms: number) => t !== null && s.ahora - t < ms;
  const v = s.ultimaVoz;
  if (!s.microfonoActivo) return 'paused';
  if (s.pendiente) return 'asking';
  if (reciente(s.ultimaAlertaCritica, DURA.alerta)) return 'alert';
  if (v?.fase === 'procesando' && reciente(v.en, DURA.procesando)) return 'processing';
  if (reciente(s.ultimoParcial, DURA.parcial)) return 'listening';
  if (v?.fase === 'registrado' && reciente(v.en, DURA.registrado)) return 'verified';
  if (v?.fase === 'no_entendido' && reciente(v.en, DURA.no_entendido)) return 'confused';
  if (reciente(s.cierreSeguro, DURA.cierre)) return 'celebrate';
  return 'idle';
}
