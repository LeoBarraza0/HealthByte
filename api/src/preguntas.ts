import type { AccionConteo, DatosEvento, EstadoCirugia, HoraId, Protocolo } from './tipos.ts';
import type { Pregunta } from './jev.ts';
import { numerosConContexto } from './numeros.ts';

/** Valores iniciales; se calibran con `npm run oro`. */
export const UMBRALES = { dirigida: 0.5, minimo: 0.6, automatico: 0.85, item: 0.7 } as const;

export const INTENCIONES = {
  hora: 'Anuncia un momento del procedimiento: paciente en sala, inicio de anestesia, inicio o fin de cirugía, salida a recuperación',
  check: 'Confirma o niega ítems de la lista de verificación de seguridad (identidad, procedimiento, sitio, alergias, antibiótico, recuentos)',
  conteo: 'Material que entra al campo o sale del campo: compresas, gasas, agujas, hojas de bisturí y similares',
  hito: 'Anuncia un hito de la cirugía, como heparina, entrada o salida de bomba, clamp o cardioplejía',
  medicion: 'Reporta una medición con su valor, como glucometría o diuresis',
  dato: 'Reporta un dato del paciente con su valor, como peso o talla',
  novedad: 'Reporta una novedad, problema o incidente que hay que dejar registrado',
  novedad_atendida: 'Dice que alguien está atendiendo la novedad abierta',
  novedad_solucionada: 'Dice que la novedad abierta quedó solucionada y qué se hizo',
  cerrar_alerta: 'Da el motivo para cerrar una alerta que no se va a resolver',
  si: 'Acepta o confirma lo que el tablero acaba de preguntar',
  no: 'Rechaza lo que el tablero acaba de preguntar',
  deshacer: 'Pide anular o deshacer el último registro',
  nada: 'Conversación del equipo que no pide registrar nada',
};

export const HORAS_TEXTO: Record<HoraId, string> = {
  ingreso: 'El paciente ingresa a la sala',
  anestesia: 'Inicia la anestesia',
  inicio_cirugia: 'Inicia la cirugía o la incisión',
  fin_cirugia: 'Termina la cirugía',
  salida_recuperacion: 'El paciente sale a recuperación',
};

/** Opciones con claves o0, o1… (el índice en la lista) más «ninguno». */
const opciones = (textos: string[]): Record<string, string> =>
  Object.fromEntries([...textos.map((t, i) => [`o${i}`, t]), ['ninguno', 'Ninguna de las anteriores']]);

export function construirPreguntas(frase: string, s: EstadoCirugia): Record<string, Pregunta> {
  const p = s.protocolo;
  const q: Record<string, Pregunta> = {
    dirigida: {
      type: 'noul',
      instructions: 'En un quirófano, ¿esta frase le dicta un registro al tablero quirúrgico (un momento, una verificación, un conteo, una medición, una novedad o una respuesta sí/no al tablero) en lugar de ser conversación del equipo?',
    },
    intencion: { type: 'choice', instructions: '¿Qué pide registrar esta frase dictada en el quirófano?', criteria: INTENCIONES },
    hora: { type: 'choice', instructions: '¿Qué momento del procedimiento anuncia la frase?', criteria: { ...HORAS_TEXTO, ninguno: 'Ninguno' } },
    movimiento: {
      type: 'choice', instructions: '¿El material entra al campo o sale del campo?',
      criteria: { entra: 'Entra, se abre, se agrega o se pasa al campo', sale: 'Sale, se retira, se cuenta de regreso o se descarta' },
    },
    valor_check: {
      type: 'choice', instructions: '¿La frase confirma, niega o dice que no aplica?',
      criteria: { si: 'Confirma, verificado, correcto', no: 'No coincide, está mal o falta', na: 'No aplica' },
    },
    hito: { type: 'choice', instructions: '¿Qué hito de la cirugía anuncia la frase?', criteria: opciones(p.hitos) },
    medicion: { type: 'choice', instructions: '¿Qué medición reporta la frase?', criteria: opciones(p.mediciones.map(m => m.etiqueta)) },
    campo: {
      type: 'choice', instructions: '¿Qué dato del paciente reporta la frase?',
      criteria: opciones(p.campos_preop.filter(c => c.tipo === 'numero').map(c => c.etiqueta)),
    },
  };
  const fase = p.fases.find(f => f.id === s.fase_actual);
  for (const item of fase?.items ?? []) {
    q[`item_${item.id}`] = { type: 'noul', instructions: `¿La frase verifica o se pronuncia sobre «${item.texto}»?` };
  }
  numerosConContexto(frase).forEach((n, i) => {
    q[`material_${i}`] = { type: 'choice', instructions: `En el fragmento «${n.span}», ¿qué material quirúrgico se nombra?`, criteria: opciones(p.materiales) };
  });
  const abiertas = s.alertas.filter(a => a.estado === 'abierta');
  if (abiertas.length) {
    q.alerta = { type: 'choice', instructions: '¿A qué alerta se refiere el motivo?', criteria: opciones(abiertas.map(a => a.mensaje)) };
  }
  return q;
}

/** Estado mínimo para Jev: el contexto irrelevante le resta precisión. */
export function estadoParaJev(frase: string, s: EstadoCirugia, hayPendiente: boolean) {
  return {
    frase,
    fase_actual: s.protocolo.fases.find(f => f.id === s.fase_actual)?.nombre ?? 'ninguna',
    ultimos_registros: s.eventos.slice(-3).map(e => describir(e.datos, s.protocolo)),
    el_tablero_pregunto_algo: hayPendiente ? 'sí' : 'no',
  };
}

export const ACCIONES_CONTEO: Record<AccionConteo, string> = {
  cirujano_avisado: 'Cirujano avisado del conteo',
  busqueda_en_campo: 'Búsqueda en campo y cubetas',
  rx_solicitada: 'Rx intraoperatoria solicitada',
};

export function describir(d: DatosEvento, p: Protocolo): string {
  switch (d.tipo) {
    case 'hora': return HORAS_TEXTO[d.hora];
    case 'presente': return 'Integrante presente';
    case 'check': {
      const item = p.fases.flatMap(f => f.items).find(i => i.id === d.item);
      return `${item?.texto ?? d.item}: ${d.valor === 'si' ? 'sí' : d.valor === 'no' ? 'no coincide' : 'no aplica'}`;
    }
    case 'conteo': return `${d.material} ${d.cantidad > 0 ? '+' : ''}${d.cantidad}`;
    case 'hito': return d.hito;
    case 'medicion': return `${p.mediciones.find(m => m.id === d.medicion)?.etiqueta ?? d.medicion} ${d.valor}`;
    case 'dato': return `${p.campos_preop.find(c => c.id === d.campo)?.etiqueta ?? d.campo} ${d.valor}`;
    case 'novedad': return `Novedad: ${d.texto}`;
    case 'novedad_atendida': return 'Novedad atendida';
    case 'novedad_solucionada': return 'Novedad solucionada';
    case 'alerta_cierre': return `Alerta cerrada: ${d.motivo}`;
    case 'accion_conteo': return ACCIONES_CONTEO[d.accion];
    case 'consumo': return `Consumo: ${d.insumo} ${d.cantidad > 0 ? '+' : ''}${d.cantidad}`;
    case 'anulacion': return 'Anulación';
  }
}
