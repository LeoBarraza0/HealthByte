import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { MsgAlCelular, MsgCamara } from '../../api/src/tipos.ts';
import { guardarPreferencia, preferencia } from './etiquetas.ts';
import './camara.css';

// Cierres que no se reintentan: los manda el servidor (api/src/sesion.ts).
const CIERRES: Record<number, string> = {
  4001: 'La tablet desconectó esta cámara.',
  4002: 'El código venció o no es válido. Pida uno nuevo en la tablet.',
  4003: 'Otra cámara tomó su lugar en la sala.',
};
// ponytail: 4 cuadros por segundo a 640 px alcanzan para ver la mesa sin cargar la red del quirófano; subir si se ve entrecortado.
const CADA_MS = 250;
const ANCHO_VIDEO = 640;
const ANCHO_FOTO = 1920; // la foto que se analiza va en alta resolución

const VINCULO = 'hb_vinculo_camara';
const leerVinculo = () => { try { return sessionStorage.getItem(VINCULO); } catch { return null; } };
const guardarVinculo = (v: string | null) => {
  try { if (v) sessionStorage.setItem(VINCULO, v); else sessionStorage.removeItem(VINCULO); } catch { /* sin almacenamiento */ }
};

function nombreCamara(): string {
  const guardado = preferencia('hb_camara_nombre');
  if (guardado) return guardado;
  const ua = navigator.userAgent;
  const nombre = `${/iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Celular Android' : 'Cámara'} ${Math.random().toString(36).slice(2, 5)}`;
  guardarPreferencia('hb_camara_nombre', nombre);
  return nombre;
}

function jpeg(video: HTMLVideoElement, lienzo: HTMLCanvasElement, ancho: number, calidad: number): Promise<Blob | null> {
  const escala = Math.min(1, ancho / video.videoWidth);
  lienzo.width = Math.round(video.videoWidth * escala);
  lienzo.height = Math.round(video.videoHeight * escala);
  lienzo.getContext('2d')?.drawImage(video, 0, 0, lienzo.width, lienzo.height);
  return new Promise(ok => lienzo.toBlob(ok, 'image/jpeg', calidad));
}

type Fase = 'codigo' | 'listo' | 'transmitiendo' | 'reconectando' | 'terminada';

/** /camara: el celular que hace de cámara de la mesa. No tiene sesión: entra con el código que muestra la tablet. */
export function CelularCamara() {
  const [codigo, setCodigo] = useState(() => decodeURIComponent(location.hash.slice(1)));
  const [fase, setFase] = useState<Fase>(() => (leerVinculo() || location.hash.length > 1 ? 'listo' : 'codigo'));
  const [mensaje, setMensaje] = useState('');
  const [quirofano, setQuirofano] = useState('');
  const [viendo, setViendo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [dispositivo] = useState(nombreCamara);

  const ws = useRef<WebSocket | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const flujo = useRef<MediaStream | null>(null);
  const pantalla = useRef<WakeLockSentinel | null>(null);
  const vinculo = useRef(leerVinculo());
  const viendoRef = useRef(0);
  const pausadoRef = useRef(false);
  const saliendo = useRef(false);
  const intentos = useRef(0);
  const reintento = useRef(0);
  const lienzos = useRef({ video: document.createElement('canvas'), foto: document.createElement('canvas') });
  pausadoRef.current = pausado;

  async function mantenerPantalla() {
    try { pantalla.current = (await navigator.wakeLock?.request('screen')) ?? null; } catch { /* no soportado o sin permiso */ }
  }

  function apagar() {
    clearTimeout(reintento.current);
    flujo.current?.getTracks().forEach(t => t.stop());
    flujo.current = null;
    void pantalla.current?.release().catch(() => {});
    pantalla.current = null;
  }

  function terminar(texto: string, siguiente: Fase) {
    apagar();
    vinculo.current = null;
    guardarVinculo(null);
    setMensaje(texto);
    setFase(siguiente);
  }

  async function enviarFoto(s: WebSocket) {
    const v = video.current;
    if (!v || v.readyState < 2) return; // sin imagen todavía: la sala avisa que la foto no llegó
    const b = await jpeg(v, lienzos.current.foto, ANCHO_FOTO, 0.85);
    if (b && s.readyState === WebSocket.OPEN) s.send(new Blob([new Uint8Array([1]), b]));
  }

  function conectar(credencial: MsgCamara) {
    const s = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/camara/ws`);
    s.onopen = () => s.send(JSON.stringify(credencial));
    s.onmessage = ev => {
      if (typeof ev.data !== 'string') return;
      const m = JSON.parse(ev.data) as MsgAlCelular;
      if (m.tipo === 'vinculada') {
        vinculo.current = m.vinculo;
        guardarVinculo(m.vinculo);
        intentos.current = 0;
        setQuirofano(m.quirofano);
        setMensaje('');
        setFase('transmitiendo');
        history.replaceState(null, '', '/camara'); // el código ya se usó: fuera de la barra de direcciones
      } else if (m.tipo === 'viendo') {
        viendoRef.current = m.n;
        setViendo(m.n);
      } else if (m.tipo === 'foto') {
        void enviarFoto(s);
      }
    };
    s.onclose = ev => {
      if (ws.current !== s) return;
      ws.current = null;
      viendoRef.current = 0;
      if (saliendo.current) return;
      const definitivo = CIERRES[ev.code];
      if (definitivo || !vinculo.current) {
        terminar(definitivo ?? 'No se pudo conectar con la sala.', ev.code === 4002 ? 'codigo' : 'terminada');
        return;
      }
      setFase('reconectando');
      const v = vinculo.current;
      reintento.current = window.setTimeout(() => conectar({ tipo: 'reanudar', vinculo: v, dispositivo }), Math.min(10_000, 1000 * 2 ** intentos.current++));
    };
    ws.current = s;
  }

  async function empezar() {
    setMensaje('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMensaje('El navegador solo deja usar la cámara en una dirección segura (https). Abra la dirección https de HealthByte.');
      return;
    }
    try {
      flujo.current ??= await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
    } catch {
      setMensaje('No se pudo abrir la cámara. Revise el permiso del navegador para este sitio.');
      return;
    }
    saliendo.current = false;
    await mantenerPantalla();
    const v = vinculo.current;
    conectar(v ? { tipo: 'reanudar', vinculo: v, dispositivo } : { tipo: 'vincular', codigo, dispositivo });
    setFase('reconectando'); // hasta que la sala confirme
  }

  function desconectar() {
    saliendo.current = true;
    ws.current?.close(1000, 'Desconectada desde el celular');
    ws.current = null;
    terminar('Cámara desconectada. Puede cerrar esta pestaña.', 'terminada');
  }

  // Cuadros del video, solo si alguien los ve y la red no está atrasada.
  useEffect(() => {
    if (fase !== 'transmitiendo') return;
    let ocupado = false;
    const t = setInterval(async () => {
      const s = ws.current;
      const v = video.current;
      if (ocupado || !s || s.readyState !== WebSocket.OPEN || s.bufferedAmount > 0 || !viendoRef.current || pausadoRef.current || !v || v.readyState < 2) return;
      ocupado = true;
      const b = await jpeg(v, lienzos.current.video, ANCHO_VIDEO, 0.6);
      ocupado = false;
      if (b && ws.current === s && s.readyState === WebSocket.OPEN) s.send(new Blob([new Uint8Array([0]), b]));
    }, CADA_MS);
    const latido = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ tipo: 'latido' } satisfies MsgCamara));
    }, 25_000);
    return () => { clearInterval(t); clearInterval(latido); };
  }, [fase]);

  // El sistema suelta el bloqueo de pantalla al cambiar de app: se pide otra vez al volver.
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible' && flujo.current) void mantenerPantalla(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, []);

  useEffect(() => () => { saliendo.current = true; ws.current?.close(); apagar(); }, []);

  const conVideo = (el: HTMLVideoElement | null) => {
    video.current = el;
    if (el && flujo.current && el.srcObject !== flujo.current) {
      el.srcObject = flujo.current;
      void el.play().catch(() => {});
    }
  };

  if (fase === 'transmitiendo' || fase === 'reconectando') {
    const conectada = fase === 'transmitiendo';
    return (
      <div className="celular">
        <div className="celular-visor">
          <video ref={conVideo} muted playsInline autoPlay aria-label="Lo que ve la cámara" />
          <span className="celular-esquina a" aria-hidden="true" /><span className="celular-esquina b" aria-hidden="true" />
          <span className="celular-esquina c" aria-hidden="true" /><span className="celular-esquina d" aria-hidden="true" />
          <span className="camara-chip arriba">Encuadre toda la mesa de instrumental</span>
          <span className="camara-chip abajo">
            <span className="camara-punto" aria-hidden="true" />
            {!conectada ? 'Reconectando…' : pausado ? 'En pausa' : `Transmitiendo a ${quirofano}`}
          </span>
        </div>
        <div className="celular-lado">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }} role="status">
            <span className="celular-estado"><span className={`celular-punto ${conectada ? '' : 'apagado'}`} />{conectada ? 'Conectada' : 'Reconectando'}</span>
            <p className="celular-sub">{dispositivo}</p>
            <p className="celular-sub">{viendo > 0 ? `La ve${viendo > 1 ? 'n' : ''} ${viendo} dispositivo${viendo > 1 ? 's' : ''}` : 'Nadie ve el video: no gasta datos'}</p>
          </div>
          <p className="celular-sub">Lo que cuenta la cámara se ve en la tablet. Deje esta pantalla encendida.</p>
          <div className="celular-acciones">
            <button className="btn-cabecera" type="button" aria-pressed={pausado} onClick={() => setPausado(p => !p)}>
              {pausado ? 'Reanudar' : 'Pausar'}
            </button>
            <button className="btn-cabecera peligro" type="button" onClick={desconectar}>Desconectar</button>
          </div>
        </div>
      </div>
    );
  }

  const enviarCodigo = (e: FormEvent) => {
    e.preventDefault();
    vinculo.current = null;
    void empezar();
  };

  return (
    <div className="celular-centro">
      {fase === 'codigo' ? (
        <form className="celular-tarjeta" onSubmit={enviarCodigo}>
          <h1>Usar este celular como cámara</h1>
          <p>Escriba el código que muestra la tablet en «Conectar una cámara».</p>
          <label>
            Código
            <input value={codigo} onChange={e => setCodigo(e.target.value)} maxLength={9} autoComplete="off" autoCapitalize="characters"
              spellCheck={false} placeholder="K7Q2 M9XD" required />
          </label>
          {mensaje && <p className="celular-error" role="alert">{mensaje}</p>}
          <button className="btn btn-primario" type="submit">Conectar</button>
        </form>
      ) : fase === 'terminada' ? (
        <div className="celular-tarjeta">
          <h1>Cámara desconectada</h1>
          <p role="status">{mensaje}</p>
          <button className="btn btn-primario" type="button" onClick={() => { setCodigo(''); setMensaje(''); setFase('codigo'); }}>
            Conectar con otro código
          </button>
        </div>
      ) : (
        <div className="celular-tarjeta">
          <h1>Cámara de la mesa</h1>
          <p>Al empezar, el navegador pide permiso para usar la cámara. Ponga el celular acostado sobre la mesa de instrumental, a unos 80 cm.</p>
          <p>El video no se guarda: la sala solo guarda la foto de cada conteo.</p>
          {mensaje && <p className="celular-error" role="alert">{mensaje}</p>}
          <button className="btn btn-primario" type="button" onClick={() => void empezar()}>
            {vinculo.current ? 'Reanudar la transmisión' : 'Empezar'}
          </button>
        </div>
      )}
    </div>
  );
}
