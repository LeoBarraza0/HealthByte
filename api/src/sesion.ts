import type {
  CanalVoz, Captura, DatosEvento, Decision, EstadoCamara, EstadoCirugia, Evento, EventosVoz, HoraId, ModoCamara, MsgAlCelular,
  MsgCamara, MsgCliente, MsgServidor, NuevoEvento, Protocolo, ResultadoVision, Rol, Sesion,
} from './tipos.ts';
export type { CanalVoz, EventosVoz } from './tipos.ts';
import { HORAS } from './tipos.ts';
import { vocabulario } from './protocolos.ts';
import { corregir } from './correccion.ts';
import { describir } from './preguntas.ts';
import { avisoSinPropuesta, crearVinculos, ordenDeCamara, propuestaDeConteo, propuestaDeIndicador, resumenVisto } from './camara.ts';

export interface NuevaCaptura { modo: ModoCamara; imagen: Uint8Array; resultado: ResultadoVision; pedida_por: string; dispositivo: string }
export interface Deps {
  cargarEstado(clinicaId: string, cirugiaId: string): Promise<EstadoCirugia | null>;
  insertarEventos(clinicaId: string, cirugiaId: string, eventos: NuevoEvento[]): Promise<void>;
  interpretar(frase: string, estado: EstadoCirugia, hayPendiente: boolean): Promise<Decision>;
  abrirVoz(eventos: EventosVoz, frases: string[]): CanalVoz;
  // Cámara de la mesa: sin estas dos, la sala avisa que la visión no está configurada.
  analizar?(imagen: Uint8Array, modo: ModoCamara, materiales: string[]): Promise<ResultadoVision>;
  guardarCaptura?(clinicaId: string, cirugiaId: string, c: NuevaCaptura): Promise<Captura>;
  esperaConfirmacionMs?: number;
  esperaFotoMs?: number;
}
export interface Cliente { sesion: Sesion; dispositivo: string; enviar(m: MsgServidor): void; enviarCuadro?(jpeg: Uint8Array): void }
/** El celular que hace de cámara. No tiene sesión de usuario: entra a una sola sala con su vínculo. */
export interface ClienteCamara { enviar(m: MsgAlCelular): void; cerrar(codigo: number, motivo: string): void }

interface PendienteSala { eventos: NuevoEvento[]; resumen: string; expira: number; origen: 'voz' | 'camara'; timer: ReturnType<typeof setTimeout> }
interface CamaraSala {
  cliente: ClienteCamara;
  dispositivo: string;
  desde: string;
  foto: { ok(jpeg: Uint8Array): void; error(e: Error): void } | null; // la foto pedida que se espera
}
interface Sala {
  clinicaId: string;
  cirugiaId: string;
  estado: EstadoCirugia;
  clientes: Set<Cliente>;
  microfono: Cliente | null;
  voz: CanalVoz | null;
  pendiente: PendienteSala | null;
  camara: CamaraSala | null;
  viendo: Set<Cliente>; // a quién se le reenvía el video
  analizando: boolean;
  ultimaCaptura: Captura | null;
}

// Campos obligatorios por tipo de evento. 'valor' acepta texto o número.
const FORMAS: Record<DatosEvento['tipo'], Record<string, 'string' | 'number' | 'valor'>> = {
  hora: { hora: 'string' },
  presente: { usuario_id: 'string', rol: 'string' },
  check: { fase: 'string', item: 'string', valor: 'string' },
  conteo: { material: 'string', cantidad: 'number' },
  hito: { hito: 'string' },
  medicion: { medicion: 'string', valor: 'number' },
  dato: { campo: 'string', valor: 'valor' },
  novedad: { texto: 'string' },
  novedad_atendida: { novedad_id: 'string', responsable: 'string' },
  novedad_solucionada: { novedad_id: 'string', acciones: 'string' },
  alerta_cierre: { alerta: 'string', motivo: 'string' },
  accion_conteo: { accion: 'string' },
  consumo: { insumo: 'string', cantidad: 'number' },
  anulacion: { evento_id: 'string' },
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida datos que llegan del navegador: tipo conocido, campos con el tipo correcto, sin campos extra. */
export function validarDatos(d: unknown): DatosEvento | null {
  if (typeof d !== 'object' || d === null) return null;
  const o = d as Record<string, unknown>;
  if (typeof o.tipo !== 'string' || !Object.hasOwn(FORMAS, o.tipo)) return null;
  const forma = FORMAS[o.tipo as DatosEvento['tipo']];
  if (!forma) return null;
  const limpio: Record<string, unknown> = { tipo: o.tipo };
  for (const [campo, tipo] of Object.entries(forma)) {
    const v = o[campo];
    const tipoOk = tipo === 'valor' ? typeof v === 'string' || typeof v === 'number' : typeof v === tipo;
    if (!tipoOk) return null;
    if (typeof v === 'string' && (v.trim() === '' || v.length > 500)) return null;
    if (typeof v === 'number' && !Number.isFinite(v)) return null;
    limpio[campo] = v;
  }
  if (o.tipo === 'hora' && !HORAS.includes(o.hora as HoraId)) return null;
  if (o.tipo === 'check' && !['si', 'no', 'na'].includes(o.valor as string)) return null;
  if (o.tipo === 'accion_conteo' && !['cirujano_avisado', 'busqueda_en_campo', 'rx_solicitada'].includes(o.accion as string)) return null;
  if (o.tipo === 'consumo' && !(Number.isInteger(o.cantidad) && o.cantidad !== 0 && Math.abs(o.cantidad as number) <= 999)) return null;
  return limpio as DatosEvento;
}

function rolQueConfirma(p: Protocolo, d: DatosEvento): Rol | null {
  if (d.tipo !== 'check') return null;
  return p.fases.find(f => f.id === d.fase)?.items.find(i => i.id === d.item)?.rol ?? null;
}

const esJpeg = (b: Uint8Array) => b.length > 2 && b[0] === 0xff && b[1] === 0xd8;

export function crearSalas(deps: Deps) {
  const salas = new Map<string, Sala>();
  const salaDe = new Map<Cliente, Sala>();
  const salaDeCamara = new Map<ClienteCamara, Sala>();
  const vinculos = crearVinculos();
  const espera = deps.esperaConfirmacionMs ?? 15_000;

  const estadoCamara = (s: Sala): EstadoCamara => ({
    conectada: s.camara && { dispositivo: s.camara.dispositivo, desde: s.camara.desde },
    analizando: s.analizando,
    ultima: s.ultimaCaptura,
  });
  const difundir = (s: Sala, m: MsgServidor) => { for (const c of s.clientes) c.enviar(m); };
  const difundirEstado = (s: Sala) => difundir(s, {
    tipo: 'estado', estado: s.estado, microfono: s.microfono?.dispositivo ?? null,
    pendiente: s.pendiente && { resumen: s.pendiente.resumen, expira: s.pendiente.expira, origen: s.pendiente.origen },
    camara: estadoCamara(s),
  });
  const nuevo = (s: Sala, c: Cliente, datos: DatosEvento, origen: Evento['origen'], texto: string | null = null, confianza: number | null = null): NuevoEvento =>
    ({ datos, registrado_por: c.sesion.usuario_id, rol_confirma: rolQueConfirma(s.estado.protocolo, datos), origen, texto, confianza });

  async function registrar(s: Sala, eventos: NuevoEvento[]): Promise<void> {
    if (!eventos.length) return;
    await deps.insertarEventos(s.clinicaId, s.cirugiaId, eventos);
    s.estado = (await deps.cargarEstado(s.clinicaId, s.cirugiaId)) ?? s.estado;
    difundirEstado(s);
  }

  function limpiarPendiente(s: Sala): void {
    if (s.pendiente) clearTimeout(s.pendiente.timer);
    s.pendiente = null;
  }

  /** Deja eventos esperando un sí o un no. Quien llama difunde el estado. */
  function proponer(s: Sala, eventos: NuevoEvento[], resumen: string, origen: PendienteSala['origen'], ms: number): void {
    limpiarPendiente(s);
    s.pendiente = {
      eventos, resumen, origen, expira: Date.now() + ms,
      timer: setTimeout(() => { s.pendiente = null; difundirEstado(s); }, ms),
    };
  }

  async function responder(s: Sala, si: boolean): Promise<void> {
    const p = s.pendiente;
    if (!p) return;
    limpiarPendiente(s);
    if (si) await registrar(s, p.eventos);
    else difundirEstado(s);
  }

  async function deshacer(s: Sala, c: Cliente, origen: 'voz' | 'manual'): Promise<void> {
    const ultimo = s.estado.eventos.at(-1);
    if (ultimo) await registrar(s, [nuevo(s, c, { tipo: 'anulacion', evento_id: ultimo.id }, origen)]);
  }

  async function alFinal(s: Sala, texto: string): Promise<void> {
    const c = s.microfono;
    if (!c) return;
    const frase = corregir(texto, s.estado.instrumentos.map(i => i.nombre));
    const orden = ordenDeCamara(frase);
    if (orden) return contar(s, c, orden);
    difundir(s, { tipo: 'voz', fase: 'procesando', texto: frase });
    let d: Decision;
    try {
      d = await deps.interpretar(frase, s.estado, s.pendiente !== null);
    } catch {
      difundir(s, { tipo: 'voz', fase: 'no_entendido', texto: frase });
      difundir(s, { tipo: 'aviso', texto: `No interpretada: «${frase}». Regístrala a mano.` });
      return;
    }
    if (d.accion === 'ignorar') {
      difundir(s, { tipo: 'voz', fase: d.no_entendido ? 'no_entendido' : 'ignorado', texto: frase });
      return;
    }
    if (d.accion === 'confirmar') {
      proponer(s, d.eventos.map(x => nuevo(s, c, x, 'voz', frase, d.confianza)), d.resumen, 'voz', espera);
      difundirEstado(s);
      return;
    }
    if (d.accion === 'responder') {
      await responder(s, d.si);
      difundir(s, { tipo: 'voz', fase: d.si ? 'registrado' : 'ignorado', texto: frase });
      return;
    }
    if (d.accion === 'deshacer') await deshacer(s, c, 'voz');
    else await registrar(s, d.eventos.map(x => nuevo(s, c, x, 'voz', frase, d.confianza)));
    difundir(s, { tipo: 'voz', fase: 'registrado', texto: frase });
  }

  function soltarMicrofono(s: Sala): void {
    s.voz?.cerrar();
    s.voz = null;
    s.microfono = null;
  }

  function tomarMicrofono(s: Sala, c: Cliente): void {
    soltarMicrofono(s);
    s.microfono = c;
    s.voz = deps.abrirVoz({
      onParcial: texto => difundir(s, { tipo: 'parcial', texto }),
      onFinal: texto => { alFinal(s, texto).catch(() => difundir(s, { tipo: 'aviso', texto: 'No se pudo registrar por voz' })); },
      onError: () => difundir(s, { tipo: 'aviso', texto: 'Micrófono reconectando…' }),
    }, [...vocabulario(s.estado.protocolo), ...s.estado.insumos.map(i => i.nombre),
      ...s.estado.instrumentos.map(i => i.nombre)].slice(0, 1000));
    difundirEstado(s);
  }

  // ---------- Cámara de la mesa ----------

  const avisarViendo = (s: Sala) => s.camara?.cliente.enviar({ tipo: 'viendo', n: s.viendo.size });

  function soltarCamara(s: Sala, motivo: string): void {
    const cam = s.camara;
    if (!cam) return;
    cam.foto?.error(new Error(motivo));
    salaDeCamara.delete(cam.cliente);
    s.camara = null;
  }

  function pedirFoto(cam: CamaraSala): Promise<Uint8Array> {
    return new Promise((ok, error) => {
      const plazo = setTimeout(() => terminar(() => error(new Error('La cámara no mandó la foto'))), deps.esperaFotoMs ?? 10_000);
      const terminar = (f: () => void) => { clearTimeout(plazo); cam.foto = null; f(); };
      cam.foto = { ok: jpeg => terminar(() => ok(jpeg)), error: e => terminar(() => error(e)) };
      cam.cliente.enviar({ tipo: 'foto' });
    });
  }

  /** Pide una foto, la analiza, la guarda y deja que Conti pregunte si se registra lo que vio. Nunca registra solo. */
  async function contar(s: Sala, c: Cliente, modo: ModoCamara): Promise<void> {
    const cam = s.camara;
    if (!cam) return c.enviar({ tipo: 'aviso', texto: 'Conecte una cámara para contar con ella.' });
    if (!deps.analizar || !deps.guardarCaptura) return c.enviar({ tipo: 'aviso', texto: 'La visión por cámara no está configurada en el servidor.' });
    if (s.analizando) return;
    s.analizando = true;
    difundir(s, { tipo: 'voz', fase: 'procesando', texto: modo === 'conteo' ? 'Contando la mesa' : 'Leyendo el indicador' });
    difundirEstado(s);
    try {
      const imagen = await pedirFoto(cam);
      const resultado = await deps.analizar(imagen, modo, s.estado.protocolo.materiales);
      s.ultimaCaptura = await deps.guardarCaptura(s.clinicaId, s.cirugiaId, {
        modo, imagen, resultado, pedida_por: c.sesion.usuario_id, dispositivo: cam.dispositivo,
      });
      const datos = modo === 'conteo' ? propuestaDeConteo(s.estado, resultado.conteo) : propuestaDeIndicador(s.estado, resultado.indicador);
      if (datos.length) {
        const texto = resumenVisto(modo, resultado);
        // El doble de tiempo que la voz: antes de decir sí hay que mirar la foto.
        proponer(s, datos.map(d => nuevo(s, c, d, 'camara', texto)), datos.map(d => describir(d, s.estado.protocolo)).join(' · '), 'camara', espera * 2);
      } else {
        difundir(s, { tipo: 'aviso', texto: avisoSinPropuesta(s.estado, modo, resultado) });
      }
    } catch (e) {
      console.error('Visión por cámara:', e);
      difundir(s, { tipo: 'aviso', texto: 'No se pudo analizar la foto. Repita o registre a mano.' });
    } finally {
      s.analizando = false;
      difundirEstado(s);
    }
  }

  async function abrirSala(clinicaId: string, cirugiaId: string): Promise<Sala | null> {
    let s = salas.get(cirugiaId);
    if (!s) {
      const estado = await deps.cargarEstado(clinicaId, cirugiaId);
      if (!estado) return null;
      s = salas.get(cirugiaId) ?? {
        clinicaId, cirugiaId, estado, clientes: new Set(), microfono: null, voz: null, pendiente: null,
        camara: null, viendo: new Set(), analizando: false, ultimaCaptura: null,
      };
      salas.set(cirugiaId, s);
    }
    return s.clinicaId === clinicaId ? s : null;
  }

  function cerrarSiVacia(s: Sala): void {
    if (s.clientes.size || s.camara) return;
    limpiarPendiente(s);
    salas.delete(s.cirugiaId);
  }

  async function conectarCamara(cam: ClienteCamara, clinicaId: string, cirugiaId: string, vinculo: string, dispositivo: unknown): Promise<boolean> {
    const s = await abrirSala(clinicaId, cirugiaId);
    if (!s) return false;
    const anterior = s.camara;
    if (anterior) {
      soltarCamara(s, 'Otra cámara tomó su lugar');
      anterior.cliente.cerrar(4003, 'Otra cámara tomó su lugar');
    }
    s.camara = { cliente: cam, dispositivo: String(dispositivo ?? '').trim().slice(0, 40) || 'Cámara', desde: new Date().toISOString(), foto: null };
    salaDeCamara.set(cam, s);
    cam.enviar({ tipo: 'vinculada', vinculo, quirofano: s.estado.cirugia.quirofano });
    avisarViendo(s);
    difundirEstado(s);
    return true;
  }

  function salir(c: Cliente): void {
    const s = salaDe.get(c);
    if (!s) return;
    salaDe.delete(c);
    s.clientes.delete(c);
    if (s.viendo.delete(c)) avisarViendo(s);
    if (s.microfono === c) soltarMicrofono(s);
    if (s.clientes.size) return difundirEstado(s);
    cerrarSiVacia(s);
  }

  async function unirse(c: Cliente, cirugiaId: string, dispositivo: string): Promise<boolean> {
    salir(c);
    c.dispositivo = dispositivo.trim().slice(0, 40) || 'Dispositivo';
    const s = await abrirSala(c.sesion.clinica_id, cirugiaId);
    if (!s) return false;
    s.clientes.add(c);
    salaDe.set(c, s);
    difundirEstado(s);
    return true;
  }

  return {
    async mensaje(c: Cliente, m: MsgCliente): Promise<void> {
      if (m?.tipo === 'unirse') {
        const ok = typeof m.cirugia_id === 'string' && UUID.test(m.cirugia_id)
          && await unirse(c, m.cirugia_id, String(m.dispositivo ?? ''));
        if (!ok) c.enviar({ tipo: 'aviso', texto: 'Cirugía no encontrada' });
        return;
      }
      const s = salaDe.get(c);
      if (!s) return;
      switch (m?.tipo) {
        case 'registrar': {
          const d = validarDatos(m.datos);
          if (!d || (d.tipo === 'check' && !rolQueConfirma(s.estado.protocolo, d))) {
            c.enviar({ tipo: 'aviso', texto: 'Registro inválido' });
            return;
          }
          return registrar(s, [nuevo(s, c, d, 'manual')]);
        }
        case 'confirmar': return responder(s, m.si === true);
        case 'deshacer': return deshacer(s, c, 'manual');
        case 'tomar_microfono': return tomarMicrofono(s, c);
        case 'soltar_microfono':
          if (s.microfono === c) { soltarMicrofono(s); difundirEstado(s); }
          return;
        case 'camara_codigo': {
          const { codigo, expira } = vinculos.emitir(s.clinicaId, s.cirugiaId);
          return c.enviar({ tipo: 'camara_codigo', codigo, expira });
        }
        case 'camara_contar':
          if (m.modo === 'conteo' || m.modo === 'esterilizacion') return contar(s, c, m.modo);
          return;
        case 'camara_ver':
          if (m.ver === true) s.viendo.add(c); else s.viendo.delete(c);
          avisarViendo(s);
          return;
        case 'camara_desconectar': {
          vinculos.revocar(s.cirugiaId);
          const cam = s.camara;
          if (!cam) return;
          soltarCamara(s, 'Desconectada desde la tablet');
          cam.cliente.cerrar(4001, 'Desconectada desde la tablet');
          return difundirEstado(s);
        }
      }
    },
    audio(c: Cliente, audio: Buffer): void {
      const s = salaDe.get(c);
      if (s?.microfono === c) s.voz?.escribir(audio);
    },
    salir,

    /** Primer mensaje del celular: canjea el código de la tablet o reanuda con su vínculo. */
    async camara(cam: ClienteCamara, m: MsgCamara): Promise<boolean> {
      if (m?.tipo === 'vincular' && typeof m.codigo === 'string') {
        const v = vinculos.canjear(m.codigo);
        return v ? conectarCamara(cam, v.clinicaId, v.cirugiaId, v.vinculo, m.dispositivo) : false;
      }
      if (m?.tipo === 'reanudar' && typeof m.vinculo === 'string') {
        const v = vinculos.validar(m.vinculo);
        return v ? conectarCamara(cam, v.clinicaId, v.cirugiaId, m.vinculo, m.dispositivo) : false;
      }
      return false;
    },
    /** Un mensaje binario del celular: byte 0, cuadro de video para quien lo ve; byte 1, la foto pedida. */
    cuadro(cam: ClienteCamara, datos: Uint8Array): void {
      const s = salaDeCamara.get(cam);
      const actual = s?.camara;
      const jpeg = datos.subarray(1);
      if (!s || actual?.cliente !== cam || !esJpeg(jpeg)) return;
      if (datos[0] === 1) actual.foto?.ok(jpeg);
      else for (const c of s.viendo) c.enviarCuadro?.(jpeg);
    },
    salirCamara(cam: ClienteCamara): void {
      const s = salaDeCamara.get(cam);
      if (!s || s.camara?.cliente !== cam) return;
      soltarCamara(s, 'La cámara se desconectó');
      if (s.clientes.size) difundirEstado(s);
      else cerrarSiVacia(s);
    },
  };
}
