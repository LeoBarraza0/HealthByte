// Contrato entre el API y el front. El front solo importa tipos de aquí.
// Archivo compartido: solo lo cambia el orquestador (ver AGENTS.md).

export type Rol =
  | 'cirujano' | 'anestesiologo' | 'instrumentador' | 'auxiliar_enfermeria'
  | 'perfusionista' | 'coordinador' | 'admin';

export type HoraId = 'ingreso' | 'anestesia' | 'inicio_cirugia' | 'fin_cirugia' | 'salida_recuperacion';
export const HORAS: readonly HoraId[] = ['ingreso', 'anestesia', 'inicio_cirugia', 'fin_cirugia', 'salida_recuperacion'];

/** Rango clínico aceptable; un valor fuera de él abre una alerta crítica. */
export interface Rango { min: number; max: number }
export interface CampoPreop { id: string; etiqueta: string; tipo: 'numero' | 'texto'; unidad?: string; obligatorio: boolean; rango?: Rango }
export interface ItemChecklist { id: string; texto: string; rol: Rol; critico?: boolean }
export interface Fase { id: string; nombre: string; abre_con: HoraId; cierra_antes_de: HoraId; items: ItemChecklist[] }
export interface Medicion { id: string; etiqueta: string; unidad: string; rango?: Rango }
export interface Duracion { nombre: string; desde: string; hasta: string }
export interface Protocolo {
  especialidad: string;
  campos_preop: CampoPreop[];
  fases: Fase[];
  materiales: string[];
  hitos: string[];
  mediciones: Medicion[];
  duraciones: Duracion[];
}

export interface Persona { id: string; nombre: string }
export interface Cirugia {
  id: string;
  quirofano: string;
  fecha_programada: string;
  paciente: { nombre: string; tipo_doc: string; num_doc: string; edad: number; eps: string; hc: string };
  procedimiento: string;
  diagnostico: string;
  lateralidad: string;
  equipo_programado: Partial<Record<Rol, Persona>>;
  datos_preop: Record<string, string | number | null>;
}

export type DatosEvento =
  | { tipo: 'hora'; hora: HoraId }
  | { tipo: 'presente'; usuario_id: string; rol: Rol }
  | { tipo: 'check'; fase: string; item: string; valor: 'si' | 'no' | 'na' }
  | { tipo: 'conteo'; material: string; cantidad: number } // positiva entra, negativa sale
  | { tipo: 'hito'; hito: string }
  | { tipo: 'medicion'; medicion: string; valor: number }
  | { tipo: 'dato'; campo: string; valor: string | number }
  | { tipo: 'novedad'; texto: string }
  | { tipo: 'novedad_atendida'; novedad_id: string; responsable: string }
  | { tipo: 'novedad_solucionada'; novedad_id: string; acciones: string }
  | { tipo: 'alerta_cierre'; alerta: string; motivo: string }
  | { tipo: 'accion_conteo'; accion: AccionConteo }
  | { tipo: 'consumo'; insumo: string; cantidad: number } // entero distinto de 0; negativo corrige un registro de más
  | { tipo: 'anulacion'; evento_id: string };

/** Insumo del catálogo de la clínica (tabla insumo). Sin precios: los costos los maneja cada institución en otro proceso. */
export type CategoriaInsumo = 'general' | 'sutura' | 'otro' | 'equipo';
export interface Insumo { nombre: string; categoria: CategoriaInsumo }
/** Instrumental del catálogo de la clínica (tabla instrumento). Corrige los nombres que Chirp transcribe mal. */
export interface Instrumento { codigo: string; nombre: string; categoria: string }
/** Una línea de la hoja de consumo. del_conteo: sale del material que entró al campo, no se registra aparte. */
export interface LineaConsumo { insumo: string; cantidad: number; del_conteo: boolean }

/** Pasos del protocolo cuando el conteo de material no cuadra. */
export type AccionConteo = 'cirujano_avisado' | 'busqueda_en_campo' | 'rx_solicitada';

export interface Evento {
  id: string;
  ts: string;
  datos: DatosEvento;
  registrado_por: string | null;
  rol_confirma: Rol | null;
  origen: 'voz' | 'manual' | 'camara'; // camara: lo propuso la cámara de la mesa y alguien lo confirmó
  texto: string | null;
  confianza: number | null;
}
export type NuevoEvento = Omit<Evento, 'id' | 'ts'>;

/** Qué mira la cámara de la mesa: el material para el conteo o el indicador de esterilización de un paquete. */
export type ModoCamara = 'conteo' | 'esterilizacion';
/** Un objeto que vio la cámara. caja: [ymin, xmin, ymax, xmax] normalizada de 0 a 1000. cantidad > 1: un paquete cerrado. */
export interface Deteccion { material: string; cantidad: number; caja: [number, number, number, number] }
export interface LecturaIndicador { estado: 'viro' | 'no_viro' | 'no_visible'; lote: string | null; vence: string | null; caja: [number, number, number, number] | null }
export interface ResultadoVision {
  conteo: Record<string, number>; // unidades por material, la suma de las detecciones
  detecciones: Deteccion[];
  indicador: LecturaIndicador | null; // solo en modo esterilizacion
  nota: string | null;
}
/** Una foto que analizó la cámara (tabla captura). La imagen se pide aparte: GET /api/capturas/:id/imagen. */
export interface Captura { id: string; ts: string; modo: ModoCamara; resultado: ResultadoVision; dispositivo: string }
export interface EstadoCamara {
  conectada: { dispositivo: string; desde: string } | null;
  analizando: boolean;
  ultima: Captura | null; // la última foto analizada en esta sala desde que arrancó el servidor
}

export interface Alerta {
  id: string;
  severidad: 'critica' | 'advertencia';
  mensaje: string;
  estado: 'abierta' | 'resuelta' | 'cerrada';
  desde: string;
  hasta: string | null;
  motivo: string | null;
}
export interface Check { valor: 'si' | 'no' | 'na'; ts: string; rol: Rol | null }
export interface Novedad {
  id: string;
  texto: string;
  ts: string;
  estado: 'detectada' | 'atendida' | 'solucionada';
  responsable: string | null;
  acciones: string | null;
  solucionada_ts: string | null;
}

export interface EstadoCirugia {
  cirugia: Cirugia;
  protocolo: Protocolo;
  horas: Partial<Record<HoraId, string>>;
  presentes: string[];
  checks: Record<string, Check>; // clave `${fase}.${item}`
  fase_actual: string | null;
  conteo: Record<string, { entra: number; sale: number }>;
  datos: Record<string, string | number | null>;
  novedades: Novedad[];
  duraciones: { nombre: string; minutos: number | null }[];
  alertas: Alerta[];
  acciones_conteo: { accion: AccionConteo; ts: string }[];
  consumo: LineaConsumo[];
  insumos: Insumo[]; // catálogo de la clínica; lo agrega repo.cargarEstado, derivar() lo deja vacío
  instrumentos: Instrumento[]; // igual que insumos
  eventos: Evento[]; // solo los vigentes, en orden
}

export type Decision =
  | { accion: 'ignorar'; no_entendido?: boolean } // no_entendido: iba dirigida al tablero, pero no se pudo interpretar
  | { accion: 'registrar' | 'confirmar'; eventos: DatosEvento[]; confianza: number; resumen: string }
  | { accion: 'responder'; si: boolean }
  | { accion: 'deshacer' };

// Voz: lo implementa api/src/voz.ts y lo usa api/src/sesion.ts.
export interface CanalVoz { escribir(audio: Uint8Array): void; cerrar(): void }
export interface EventosVoz { onParcial(texto: string): void; onFinal(texto: string): void; onError(e: Error): void }

export type MsgCliente =
  | { tipo: 'unirse'; cirugia_id: string; dispositivo: string }
  | { tipo: 'registrar'; datos: DatosEvento }
  | { tipo: 'confirmar'; si: boolean }
  | { tipo: 'deshacer' }
  | { tipo: 'tomar_microfono' }
  | { tipo: 'soltar_microfono' }
  | { tipo: 'camara_codigo' } // pide un código para vincular un celular como cámara
  | { tipo: 'camara_contar'; modo: ModoCamara }
  | { tipo: 'camara_ver'; ver: boolean } // recibir o no el video de la cámara
  | { tipo: 'camara_desconectar' };

/** origen camara: Conti pregunta si se registra lo que vio la cámara. */
export interface Pendiente { resumen: string; expira: number; origen: 'voz' | 'camara' }
/** Qué pasó con la última frase dictada; lo usa Conti, la mascota, para cambiar de estado. */
export type FaseVoz = 'procesando' | 'registrado' | 'ignorado' | 'no_entendido';
/** Además de estos mensajes, el servidor manda los cuadros del video como mensajes binarios (JPEG) a quien pidió verlo. */
export type MsgServidor =
  | { tipo: 'estado'; estado: EstadoCirugia; microfono: string | null; pendiente: Pendiente | null; camara: EstadoCamara }
  | { tipo: 'parcial'; texto: string }
  | { tipo: 'voz'; fase: FaseVoz; texto: string }
  | { tipo: 'aviso'; texto: string }
  | { tipo: 'camara_codigo'; codigo: string; expira: number };

// Celular que hace de cámara, por /api/camara/ws. Sin sesión: entra con el código de un solo uso que muestra la tablet.
// Manda los cuadros como mensajes binarios: un byte de cabecera (0 video, 1 foto pedida) y el JPEG.
export type MsgCamara =
  | { tipo: 'vincular'; codigo: string; dispositivo: string }
  | { tipo: 'reanudar'; vinculo: string; dispositivo: string } // reconexión con el vínculo que devolvió 'vinculada'
  | { tipo: 'latido' };
export type MsgAlCelular =
  | { tipo: 'vinculada'; vinculo: string; quirofano: string }
  | { tipo: 'foto' } // la sala pide una foto en alta resolución para analizarla
  | { tipo: 'viendo'; n: number }; // cuántos dispositivos ven el video; con 0, el celular no manda cuadros

export interface Sesion { usuario_id: string; clinica_id: string; rol: Rol; nombre: string }

export interface CirugiaActiva {
  id: string;
  quirofano: string;
  fecha_programada: string;
  paciente: string;
  procedimiento: string;
  especialidad: string;
  en_curso: boolean;
}

export interface Panel {
  cirugias: { programadas: number; en_curso: number; realizadas: number };
  checklists: { completas: number; incompletas: number };
  cumplimiento: number | null;
  alertas: { abiertas: number; resueltas: number; cerradas: number; frecuentes: { mensaje: string; veces: number }[] };
  /** Riesgos resueltos a tiempo, sin contar los pendientes rutinarios del checklist. */
  atrapados: { categoria: string; veces: number }[];
  tiempos: { etapa: string; minutos: number | null }[];
  novedades: { abiertas: number; solucionadas: number; minutos_solucion: number | null };
  duraciones: { nombre: string; minutos: number | null }[];
  lista: {
    id: string; fecha: string; quirofano: string; paciente: string; procedimiento: string; especialidad: string;
    estado: 'programada' | 'en_curso' | 'realizada'; alertas_abiertas: number; alertas_cerradas: number;
    alertas_resueltas: number;
    protocolo_cumplido: boolean;
    minutos: number | null; // del ingreso a la salida a recuperación
  }[];
}
