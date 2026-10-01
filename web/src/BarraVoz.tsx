import { useEffect, useRef, useState } from 'react';
import type { EstadoCirugia, FaseVoz, MsgCliente, Pendiente } from '../../api/src/tipos.ts';
import type { Modo } from './props.ts';
import { estadoConti } from './estadoConti.ts';
import { describir, guardarPreferencia, hora, preferencia } from './etiquetas.ts';
import { iniciarMicrofono } from './microfono.ts';
import { cierreSeguro, nuevaCritica } from './marco.ts';

export interface PropsBarraVoz {
  estado: EstadoCirugia;
  modo: Modo;
  microfono: string | null;
  pendiente: Pendiente | null;
  parcial: string;
  ultimoParcial: number | null;
  ultimaVoz: { fase: FaseVoz; en: number } | null;
  aviso: string;
  dispositivo: string;
  enviar: (m: MsgCliente) => void;
  enviarAudio: (pcm: Int16Array) => void;
}

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
  const [, setNivel] = useState(0);
  const [umbral, setUmbral] = useState(() => Number(preferencia('hb_umbral') ?? 0.02));
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
            <span className="barra-voz-sub">
              {microfono ? `Escucha: ${microfono}` : 'Micrófono apagado'}
            </span>
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
                  max="20"
                  value={Math.round(umbral * 100)}
                  onChange={e => {
                    const v = Number(e.target.value) / 100;
                    setUmbral(v);
                    guardarPreferencia('hb_umbral', String(v));
                  }}
                />
              </label>
            </>
          )}
        </div>
      </div>

      <div className="barra-voz-centro">
        {parcial ? (
          <p className="barra-voz-dictado display">«{parcial}»</p>
        ) : errorMic ? (
          <p className="barra-voz-aviso error">{errorMic}</p>
        ) : aviso ? (
          <p className="barra-voz-aviso">{aviso}</p>
        ) : null}
      </div>

      <div className="barra-voz-derecha">
        {pendiente ? (
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
