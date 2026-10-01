import type { CanalVoz, DatosEvento, Decision, EstadoCirugia, EventosVoz, HoraId, MsgCliente, MsgServidor, NuevoEvento, Protocolo, Rol, Sesion } from './tipos.ts';
export type { CanalVoz, EventosVoz } from './tipos.ts';
import { HORAS } from './tipos.ts';
import { vocabulario } from './protocolos.ts';

export interface Deps {
  cargarEstado(clinicaId: string, cirugiaId: string): Promise<EstadoCirugia | null>;
  insertarEventos(clinicaId: string, cirugiaId: string, eventos: NuevoEvento[]): Promise<void>;
  interpretar(frase: string, estado: EstadoCirugia, hayPendiente: boolean): Promise<Decision>;
  abrirVoz(eventos: EventosVoz, frases: string[]): CanalVoz;
  esperaConfirmacionMs?: number;
}
export interface Cliente { sesion: Sesion; dispositivo: string; enviar(m: MsgServidor): void }

interface PendienteSala { eventos: NuevoEvento[]; resumen: string; expira: number; timer: ReturnType<typeof setTimeout> }
interface Sala {
  clinicaId: string;
  cirugiaId: string;
  estado: EstadoCirugia;
  clientes: Set<Cliente>;
  microfono: Cliente | null;
  voz: CanalVoz | null;
  pendiente: PendienteSala | null;
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
  return limpio as DatosEvento;
}

function rolQueConfirma(p: Protocolo, d: DatosEvento): Rol | null {
  if (d.tipo !== 'check') return null;
  return p.fases.find(f => f.id === d.fase)?.items.find(i => i.id === d.item)?.rol ?? null;
}

export function crearSalas(deps: Deps) {
  const salas = new Map<string, Sala>();
  const salaDe = new Map<Cliente, Sala>();
  const espera = deps.esperaConfirmacionMs ?? 15_000;

  const difundir = (s: Sala, m: MsgServidor) => { for (const c of s.clientes) c.enviar(m); };
  const difundirEstado = (s: Sala) => difundir(s, {
    tipo: 'estado', estado: s.estado, microfono: s.microfono?.dispositivo ?? null,
    pendiente: s.pendiente && { resumen: s.pendiente.resumen, expira: s.pendiente.expira },
  });
  const nuevo = (s: Sala, c: Cliente, datos: DatosEvento, origen: 'voz' | 'manual', texto: string | null = null, confianza: number | null = null): NuevoEvento =>
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

  async function alFinal(s: Sala, frase: string): Promise<void> {
    const c = s.microfono;
    if (!c) return;
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
      const eventos = d.eventos.map(x => nuevo(s, c, x, 'voz', frase, d.confianza));
      limpiarPendiente(s);
      s.pendiente = {
        eventos, resumen: d.resumen, expira: Date.now() + espera,
        timer: setTimeout(() => { s.pendiente = null; difundirEstado(s); }, espera),
      };
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
    }, vocabulario(s.estado.protocolo));
    difundirEstado(s);
  }

  function salir(c: Cliente): void {
    const s = salaDe.get(c);
    if (!s) return;
    salaDe.delete(c);
    s.clientes.delete(c);
    if (s.microfono === c) soltarMicrofono(s);
    if (s.clientes.size) return difundirEstado(s);
    limpiarPendiente(s);
    salas.delete(s.cirugiaId);
  }

  async function unirse(c: Cliente, cirugiaId: string, dispositivo: string): Promise<boolean> {
    salir(c);
    c.dispositivo = dispositivo.trim().slice(0, 40) || 'Dispositivo';
    let s = salas.get(cirugiaId);
    if (!s) {
      const estado = await deps.cargarEstado(c.sesion.clinica_id, cirugiaId);
      if (!estado) return false;
      s = salas.get(cirugiaId) ?? { clinicaId: c.sesion.clinica_id, cirugiaId, estado, clientes: new Set(), microfono: null, voz: null, pendiente: null };
      salas.set(cirugiaId, s);
    }
    if (s.clinicaId !== c.sesion.clinica_id) return false;
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
      }
    },
    audio(c: Cliente, audio: Buffer): void {
      const s = salaDe.get(c);
      if (s?.microfono === c) s.voz?.escribir(audio);
    },
    salir,
  };
}
