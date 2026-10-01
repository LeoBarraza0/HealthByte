import { useEffect, useRef, useState } from 'react';
import type { EstadoCirugia, FaseVoz, MsgCliente, Pendiente } from '../../api/src/tipos.ts';
import type { Modo } from './props.ts';
import { estadoConti } from './estadoConti.ts';
import { describir, guardarPreferencia, hora, preferencia } from './etiquetas.ts';
import { iniciarMicrofono } from './microfono.ts';
import { cierreSeguro, nuevaCritica } from './marco.ts';
import './camara.css';

export interface PropsBarraVoz {
  estado: EstadoCirugia;
  modo: Modo;
  microfono: string | null;
  pendiente: Pendiente | null;
  parcial: string;
  ultimoParcial: number | null;
  ultimaVoz: { fase: FaseVoz; en: number; texto?: string } | null;
  aviso: string;
  dispositivo: string;
  enviar: (m: MsgCliente) => void;
  enviarAudio: (pcm: Int16Array) => void;
}

const FASE_TEXTO: Record<FaseVoz, string> = {
  procesando: 'Procesando…', registrado: 'Registrado', ignorado: 'No era para el tablero', no_entendido: 'No entendí',
};

function textoEnPalabras(c: string, microfono: string | null): string {
  switch (c) {
    case 'paused': return microfono ? `Escucha: ${microfono}` : 'Micrófono apagado';
    case 'idle': return 'Escuchando';
    case 'listening': return 'Escuchando';
    case 'processing': return 'Procesando…';
    case 'asking': return 'Esperando sí o no';
    case 'verified': return 'Registrado';
    case 'confused': return 'No entendí';
    case 'alert': return 'Alerta abierta';
    case 'celebrate': return 'Cierre seguro';
    default: return 'Escuchando';
  }
}

export function BarraVoz({
  estado,
  modo,
  microfono,
  pendiente,
  parcial,
  ultimoParcial,
  ultimaVoz,
  aviso,
  dispositivo,
  enviar,
  enviarAudio,
}: PropsBarraVoz) {
  const [ahoraMs, setAhoraMs] = useState(Date.now);
  const prevEstadoRef = useRef<EstadoCirugia | null>(null);
  const [ultimaAlertaCritica, setUltimaAlertaCritica] = useState<number | null>(null);
  const [cierreSeguroTs, setCierreSeguroTs] = useState<number | null>(null);

  // Microfono táctil en modo tablet
  const [apagar, setApagar] = useState<(() => void) | null>(null);
  const [nivel, setNivel] = useState(0);
  // Sensibilidad de 1 a 10: más alta, más sensible (umbral de volumen más bajo). 8 capta la voz normal de un portátil.
  const [sensibilidad, setSensibilidad] = useState(() => Number(preferencia('hb_sensibilidad') ?? 8));
  const umbral = (11 - sensibilidad) * 0.003;
  const [errorMic, setErrorMic] = useState('');

  const umbralRef = useRef(umbral);
  umbralRef.current = umbral;
  const apagarRef = useRef(apagar);
  apagarRef.current = apagar;

  useEffect(() => {
    const t = setInterval(() => setAhoraMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Seguimiento de alertas críticas y cierre seguro para alimentar a Conti
  useEffect(() => {
    if (nuevaCritica(prevEstadoRef.current, estado)) {
      setUltimaAlertaCritica(Date.now());
    }
    if (cierreSeguro(estado) && !cierreSeguroTs) {
      setCierreSeguroTs(Date.now());
    }
    prevEstadoRef.current = estado;
  }, [estado, cierreSeguroTs]);

  // Si otro dispositivo toma el micrófono, este deja de capturar
  useEffect(() => {
    if (apagar && microfono && microfono !== dispositivo) {
      apagar();
      setApagar(null);
    }
  }, [microfono, dispositivo, apagar]);

  useEffect(() => () => apagarRef.current?.(), []);

  async function alternarMicrofono() {
    setErrorMic('');
    if (apagar) {
      apagar();
      setApagar(null);
      enviar({ tipo: 'soltar_microfono' });
      return;
    }
    try {
      const fn = await iniciarMicrofono(enviarAudio, () => umbralRef.current, setNivel);
      enviar({ tipo: 'tomar_microfono' });
      setApagar(() => fn);
    } catch {
      setErrorMic('No se pudo abrir el micrófono. Revise el permiso del navegador.');
    }
  }

  const estadoC = estadoConti({
    ahora: ahoraMs,
    microfonoActivo: Boolean(microfono),
    ultimoParcial,
    pendiente: Boolean(pendiente),
    ultimaVoz,
    ultimaAlertaCritica,
    cierreSeguro: cierreSeguroTs,
  });

  const ultimoEvento = estado.eventos.at(-1);
  // Lo que propone la cámara lo pregunta Conti, en un globo junto a su cara.
  const preguntaCamara = pendiente?.origen === 'camara' ? pendiente : null;
  const segundos = (p: Pendiente) => Math.max(0, Math.ceil((p.expira - ahoraMs) / 1000));

  return (
    <section aria-label="Registro por voz" aria-live="polite" className="barra-voz">
      <div className="barra-voz-conti-bloque">
        <hb-conti
          state={estadoC}
          style={{ display: 'block', width: modo === 'pared' ? 112 : 64 }}
        />
        <div className="barra-voz-estado-txt">
          <span className="barra-voz-estado-titulo">{textoEnPalabras(estadoC, microfono)}</span>
          {modo === 'pared' ? (
            // En pausa el título ya dice si está apagado o quién escucha: no se repite.
            microfono && estadoC !== 'paused' && <span className="barra-voz-sub">Escucha: {microfono}</span>
          ) : (
            <>
              {microfono && microfono !== dispositivo && (
                <span className="barra-voz-sub">Escucha: {microfono}</span>
              )}
              <button
                className={`btn btn-mic ${apagar ? 'activo' : ''}`}
                aria-pressed={Boolean(apagar)}
                type="button"
                onClick={alternarMicrofono}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0" />
                  <path d="M12 18v3" />
                </svg>
                {apagar ? 'Micrófono activo' : 'Activar micrófono'}
              </button>
              <label className="barra-voz-sensibilidad">
                Sensibilidad
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={sensibilidad}
                  onChange={e => {
                    setSensibilidad(Number(e.target.value));
                    guardarPreferencia('hb_sensibilidad', e.target.value);
                  }}
                />
              </label>
              {apagar && (
                <meter className="barra-voz-nivel" min={0} max={0.06} low={umbral} value={nivel} aria-label="Nivel del micrófono" />
              )}
            </>
          )}
        </div>
      </div>

      <div className="barra-voz-centro">
        {preguntaCamara ? (
          <div className="conti-pregunta" role="group" aria-label="Conti pregunta">
            <div className="barra-voz-pendiente-info">
              <span className="barra-voz-pendiente-pregunta">¿Registro lo que vio la cámara?</span>
              <span className="barra-voz-pendiente-resumen">{preguntaCamara.resumen}</span>
              <span className="barra-voz-pendiente-expira">
                {modo === 'pared'
                  ? `Di «sí» o «no». Se descarta en ${segundos(preguntaCamara)} s.`
                  : `Mire la foto antes de responder. Se descarta en ${segundos(preguntaCamara)} s`}
              </span>
            </div>
            {modo === 'tablet' && (
              <>
                <button className="btn btn-si" type="button" onClick={() => enviar({ tipo: 'confirmar', si: true })}>Sí</button>
                <button className="btn btn-no" type="button" onClick={() => enviar({ tipo: 'confirmar', si: false })}>No</button>
              </>
            )}
          </div>
        ) : parcial ? (
          <p className="barra-voz-dictado display">«{parcial}»</p>
        ) : apagar && nivel >= umbral ? (
          <p className="barra-voz-aviso">Te escucho…</p>
        ) : errorMic ? (
          <p className="barra-voz-aviso error">{errorMic}</p>
        ) : aviso ? (
          <p className="barra-voz-aviso">{aviso}</p>
        ) : ultimaVoz?.texto ? (
          // La última frase dictada queda a la vista con lo que pasó con ella.
          <p className="barra-voz-dictado barra-voz-ultimo display">
            «{ultimaVoz.texto}» <span className="barra-voz-fase">{FASE_TEXTO[ultimaVoz.fase]}</span>
          </p>
        ) : (
          <p className="barra-voz-aviso">
            {microfono
              ? 'Hable con naturalidad: lo que diga aparece aquí mientras habla.'
              : 'Active el micrófono para dictar: lo que diga aparecerá aquí.'}
          </p>
        )}
      </div>

      <div className="barra-voz-derecha">
        {preguntaCamara ? null : pendiente ? (
          <div className="barra-voz-pendiente">
            <div className="barra-voz-pendiente-info">
              <span className="barra-voz-pendiente-pregunta">¿Registrar esto?</span>
              <span className="barra-voz-pendiente-resumen">{pendiente.resumen}</span>
              <span className="barra-voz-pendiente-expira">
                {modo === 'pared'
                  ? `Di «sí» o «no». Se descarta en ${Math.max(0, Math.ceil((pendiente.expira - ahoraMs) / 1000))} s.`
                  : `Se descarta en ${Math.max(0, Math.ceil((pendiente.expira - ahoraMs) / 1000))} s`}
              </span>
            </div>
            {modo === 'tablet' && (
              <>
                <button
                  className="btn btn-si"
                  type="button"
                  onClick={() => enviar({ tipo: 'confirmar', si: true })}
                >
                  Sí
                </button>
                <button
                  className="btn btn-no"
                  type="button"
                  onClick={() => enviar({ tipo: 'confirmar', si: false })}
                >
                  No
                </button>
              </>
            )}
          </div>
        ) : ultimoEvento ? (
          <div className="barra-voz-ultimo">
            <span className="barra-voz-check-icono">
              <svg
                width={modo === 'pared' ? 30 : 20}
                height={modo === 'pared' ? 30 : 20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={modo === 'pared' ? 3 : 2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            </span>
            <div className="barra-voz-ultimo-info">
              <span className="barra-voz-ultimo-hora">Registrado a las {hora(ultimoEvento.ts)}</span>
              <span className="barra-voz-ultimo-desc">
                {describir(ultimoEvento.datos, estado.protocolo)}
              </span>
            </div>
            {modo === 'tablet' && (
              <button
                className="btn btn-cabecera"
                type="button"
                onClick={() => enviar({ tipo: 'deshacer' })}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 14 4 9l5-5" />
                  <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
                </svg>
                Deshacer
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
