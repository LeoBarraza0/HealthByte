import type { Cirugia, DatosEvento, Evento, HoraId, Rol, Sesion } from './tipos.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';

export const CIRUGIA_ID = '00000000-0000-4000-8000-000000000001';

export const DATOS_PRUEBA: Cirugia['datos_preop'] = {
  peso: 72, talla: 168, alergias: 'Niega', grupo_sanguineo: 'O', rh: '+', reserva_sangre: '2 unidades',
  tipo_anestesia: 'General', comorbilidades: 'HTA', condiciones_especiales: '', aislamiento: 'No', glucometria: 110,
};

export const SESION_PRUEBA: Sesion = { usuario_id: 'u-circulante', clinica_id: 'cl-1', rol: 'auxiliar_enfermeria', nombre: 'Circulante' };

export function cirugiaPrueba(datos_preop: Cirugia['datos_preop'] = DATOS_PRUEBA): Cirugia {
  return {
    id: CIRUGIA_ID,
    quirofano: 'QX 01',
    fecha_programada: '2026-10-01T12:00:00.000Z',
    paciente: { nombre: 'Paciente Prueba', tipo_doc: 'CC', num_doc: '1000', edad: 55, eps: 'EPS Demo A', hc: 'HC-1' },
    procedimiento: 'Revascularización miocárdica',
    diagnostico: 'Enfermedad coronaria multivaso',
    lateralidad: 'No aplica',
    equipo_programado: {
      cirujano: { id: 'u-cir', nombre: 'Cirujana Prueba' },
      anestesiologo: { id: 'u-anes', nombre: 'Anestesiólogo Prueba' },
      instrumentador: { id: 'u-inst', nombre: 'Instrumentadora Prueba' },
      auxiliar_enfermeria: { id: 'u-circulante', nombre: 'Circulante' },
    },
    datos_preop,
  };
}

let secuencia = 0;
/** Evento de prueba en el minuto indicado a partir de las 12:00 UTC del 1 de octubre de 2026. */
export function ev(datos: DatosEvento, minuto: number, extra: Partial<Evento> = {}): Evento {
  secuencia++;
  return {
    id: `e${secuencia}`,
    ts: new Date(Date.UTC(2026, 9, 1, 12, minuto)).toISOString(),
    datos, registrado_por: 'u-circulante', rol_confirma: null, origen: 'manual', texto: null, confianza: null,
    ...extra,
  };
}

export function checksDeFase(faseId: string, minuto: number, omitir: string[] = []): Evento[] {
  const fase = PROTOCOLO_CARDIO.fases.find(f => f.id === faseId)!;
  return fase.items
    .filter(i => !omitir.includes(i.id))
    .map(i => ev({ tipo: 'check', fase: faseId, item: i.id, valor: 'si' }, minuto, { rol_confirma: i.rol }));
}

/** Una cirugía que cumple todo el protocolo: 90 minutos de cirugía. */
export function flujoCompleto(): Evento[] {
  const presentes = Object.entries(cirugiaPrueba().equipo_programado)
    .map(([rol, p]) => ev({ tipo: 'presente', usuario_id: p!.id, rol: rol as Rol }, 0));
  return [
    ev({ tipo: 'hora', hora: 'ingreso' }, 0), ...presentes, ...checksDeFase('antes_anestesia', 5),
    ev({ tipo: 'hora', hora: 'anestesia' }, 10), ...checksDeFase('antes_incision', 15),
    ev({ tipo: 'hora', hora: 'inicio_cirugia' }, 20), ev({ tipo: 'conteo', material: 'Compresas', cantidad: 10 }, 21),
    ev({ tipo: 'hora', hora: 'fin_cirugia' }, 110), ev({ tipo: 'conteo', material: 'Compresas', cantidad: -10 }, 111),
    ...checksDeFase('antes_salida', 115), ev({ tipo: 'hora', hora: 'salida_recuperacion' }, 120),
  ];
}

/** El flujo completo hasta la hora indicada, incluida. */
export function flujoHasta(hora: HoraId): Evento[] {
  const f = flujoCompleto();
  return f.slice(0, f.findIndex(e => e.datos.tipo === 'hora' && e.datos.hora === hora) + 1);
}
