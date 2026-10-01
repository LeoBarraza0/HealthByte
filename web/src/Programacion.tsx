import { useEffect, useState } from 'react';
import type { CirugiaAgenda, Quirofano, Sesion as Usuario } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { CabeceraGestion, esCoordinacion } from './CabeceraGestion.tsx';
import { bloque, horaBogota, hoyBogota } from './programacion.ts';
import './programacion.css';

const HORAS_AGENDA = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

function sumarDias(fechaYmd: string, n: number): string {
  const [y, m, d] = fechaYmd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatoFechaLarga(fechaYmd: string): string {
  try {
    const [y, m, d] = fechaYmd.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return fechaYmd;
  }
}

function horaFin(fechaIso: string, duracionMin: number): string {
  const finMs = new Date(fechaIso).getTime() + duracionMin * 60000;
  return horaBogota(new Date(finMs).toISOString());
}

export function Programacion({ yo }: { yo: Usuario }) {
  if (!esCoordinacion(yo)) {
    return (
      <div className="prog-pagina">
        <CabeceraGestion yo={yo} actual="programacion" />
        <main style={{ maxWidth: 1440, margin: '0 auto', padding: '32px 40px' }}>
          <p className="g-tenue">Esta sección es para la coordinación de la clínica.</p>
        </main>
      </div>
    );
  }

  const [fecha, setFecha] = useState<string>(() => hoyBogota());
  const [quirofanos, setQuirofanos] = useState<Quirofano[]>([]);
  const [agenda, setAgenda] = useState<CirugiaAgenda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [desplegando, setDesplegando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setErrorCarga(null);
    setDesplegando(false);

    Promise.all([
      api<Quirofano[]>('/api/quirofanos'),
      api<CirugiaAgenda[]>(`/api/agenda?fecha=${fecha}`),
    ])
      .then(([qs, ag]) => {
        if (!activo) return;
        setQuirofanos(qs);
        setAgenda(ag);
      })
      .catch((err: Error) => {
        if (!activo) return;
        if (/404|not found/i.test(err.message)) {
          setDesplegando(true);
        } else {
          setErrorCarga(err.message);
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [fecha]);

  // Cálculo de la línea de tiempo actual en Bogotá
  const hoy = hoyBogota();
  const esHoy = fecha === hoy;
  const bogotaAhora = new Date(Date.now() - 5 * 3600 * 1000);
  const minDesde7 = (bogotaAhora.getUTCHours() - 7) * 60 + bogotaAhora.getUTCMinutes();
  const lineaRojaTop = Math.round(minDesde7 * (80 / 60));
  const mostrarLineaRoja = esHoy && minDesde7 >= 0 && minDesde7 <= 12 * 60;

  const numQuirofanos = Math.max(quirofanos.length, 1);
  const gridTemplate = `64px repeat(${numQuirofanos}, minmax(0, 1fr))`;

  return (
    <div className="prog-pagina">
      <CabeceraGestion yo={yo} actual="programacion" />

      <main className="prog-main" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <div className="prog-col-izq">
          <div className="prog-encabezado">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 className="d" style={{ margin: 0, fontSize: 34, lineHeight: '40px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Programación
              </h1>
              <span style={{ fontSize: 15, color: 'var(--tenue)' }}>
                Las cirugías que se programan aquí aparecen en las tablets con su equipo y sus datos.
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className="pg btn"
                aria-label="Día anterior"
                onClick={() => setFecha(f => sumarDias(f, -1))}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <label className="prog-fl" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: 0 }}>
                <span className="sr-solo">Día</span>
                <input
                  type="date"
                  value={fecha}
                  onChange={e => e.target.value && setFecha(e.target.value)}
                  style={{ width: 'auto' }}
                />
              </label>
              <button
                type="button"
                className="pg btn"
                aria-label="Día siguiente"
                onClick={() => setFecha(f => sumarDias(f, 1))}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setFecha(hoyBogota())}
              >
                Hoy
              </button>
            </div>
          </div>

          {desplegando && (
            <div className="prog-despliegue" role="status">
              Esta función se está desplegando
            </div>
          )}

          {errorCarga && (
            <div className="prog-error" role="alert">
              {errorCarga}
            </div>
          )}

          <section aria-label={`Agenda del ${formatoFechaLarga(fecha)}`} className="prog-pn prog-agenda-pn">
            <div className="prog-agenda-in">
              <div className="prog-grid-encabezado" style={{ gridTemplateColumns: gridTemplate }}>
                <span />
                {quirofanos.map(q => (
                  <span key={q.id} className="d" style={{ fontSize: 17, fontWeight: 600, padding: '0 12px' }}>
                    {q.nombre}
                  </span>
                ))}
              </div>

              <div className="prog-grid-cuerpo" style={{ gridTemplateColumns: gridTemplate }}>
                {/* Columna de marcas horarias */}
                <div className="prog-col-horas">
                  {HORAS_AGENDA.map((h, i) => (
                    <span key={h} className="prog-hora-lbl" style={{ top: i * 80 }}>
                      {String(h).padStart(2, '0')}:00
                    </span>
                  ))}
                </div>

                {/* Columnas por quirófano */}
                {quirofanos.map(q => {
                  const cirugiasQ = agenda.filter(c => c.quirofano_id === q.id || c.quirofano === q.nombre);
                  return (
                    <div key={q.id} className="prog-col-quirofano">
                      {/* Líneas horarias */}
                      {HORAS_AGENDA.map((h, i) => (
                        <span key={h} aria-hidden="true" className="prog-linea-hora" style={{ top: i * 80 }} />
                      ))}

                      {cirugiasQ.length === 0 && !cargando && (
                        <span className="prog-libre">Libre todo el día.</span>
                      )}

                      {cirugiasQ.map(c => {
                        const { top, alto } = bloque(c.fecha_programada, c.duracion_min);
                        const ini = horaBogota(c.fecha_programada);
                        const fin = horaFin(c.fecha_programada, c.duracion_min);
                        const enlace = c.estado === 'realizada' ? `/trazabilidad/${c.id}` : `/sesion/${c.id}`;

                        return (
                          <a
                            key={c.id}
                            href={enlace}
                            className={`prog-bloque ${c.estado}`}
                            style={{ top, height: alto }}
                          >
                            <span className="prog-bloque-horas">{ini} a {fin}</span>
                            <span className="prog-bloque-proc">{c.procedimiento}</span>
                            <span className="prog-bloque-paciente">{c.paciente}</span>
                          </a>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Línea roja de hora actual */}
                {mostrarLineaRoja && (
                  <div aria-hidden="true" className="prog-linea-ahora" style={{ top: lineaRojaTop }}>
                    <span className="prog-linea-ahora-punto" />
                  </div>
                )}
              </div>
            </div>

            <p style={{ margin: '18px 0 0', fontSize: 14, color: 'var(--tenue)' }}>
              La línea roja es la hora actual. Toque una franja libre para programar a esa hora.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
