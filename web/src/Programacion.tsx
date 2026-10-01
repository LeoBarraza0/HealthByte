import { type FormEvent, useEffect, useState } from 'react';
import type {
  CirugiaAgenda,
  Integrante,
  NuevaCirugia,
  ProtocoloResumen,
  Quirofano,
  Rol,
  Sesion as Usuario,
} from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { CabeceraGestion, esCoordinacion } from './CabeceraGestion.tsx';
import { ROLES } from './etiquetas.ts';
import { aIsoBogota, bloque, horaBogota, hoyBogota } from './programacion.ts';
import './programacion.css';

const HORAS_AGENDA = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const DURACIONES: [number, string][] = [
  [60, '1 h'],
  [90, '1 h 30'],
  [120, '2 h'],
  [150, '2 h 30'],
  [180, '3 h'],
  [240, '4 h'],
  [300, '5 h'],
];

const HORAS_INICIO: string[] = [];
for (let h = 6; h <= 20; h++) {
  const hh = String(h).padStart(2, '0');
  HORAS_INICIO.push(`${hh}:00`);
  if (h < 20) HORAS_INICIO.push(`${hh}:30`);
}

const TIPOS_DOC = ['CC', 'TI', 'CE', 'PA'];
const LATERALIDADES = ['No aplica', 'Derecha', 'Izquierda', 'Bilateral'];

function sumarDias(fechaYmd: string, n: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaYmd)) return hoyBogota();
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
  const time = new Date(fechaIso).getTime();
  if (isNaN(time)) return '';
  const dur = Math.max(0, Number(duracionMin) || 0);
  const finMs = time + dur * 60000;
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
  const [protocolos, setProtocolos] = useState<ProtocoloResumen[]>([]);
  const [personal, setPersonal] = useState<Integrante[]>([]);
  const [agenda, setAgenda] = useState<CirugiaAgenda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [desplegandoMaestros, setDesplegandoMaestros] = useState(false);
  const [desplegandoAgenda, setDesplegandoAgenda] = useState(false);
  const [errorMaestros, setErrorMaestros] = useState<string | null>(null);
  const [errorAgenda, setErrorAgenda] = useState<string | null>(null);

  // Intervalo de tiempo para mantener actualizada la hora actual y la línea roja
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Estados del formulario "Nueva cirugía"
  const [formQuirofano, setFormQuirofano] = useState('');
  const [formFecha, setFormFecha] = useState(() => hoyBogota());
  const [formHora, setFormHora] = useState('08:00');
  const [formDuracion, setFormDuracion] = useState(120);

  const [formTipoDoc, setFormTipoDoc] = useState('CC');
  const [formNumDoc, setFormNumDoc] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formFechaNac, setFormFechaNac] = useState('');
  const [formEps, setFormEps] = useState('');
  const [formHc, setFormHc] = useState('');

  const [formProtocolo, setFormProtocolo] = useState('');
  const [formProcedimiento, setFormProcedimiento] = useState('');
  const [formDiagnostico, setFormDiagnostico] = useState('');
  const [formLateralidad, setFormLateralidad] = useState('No aplica');

  const [formEquipo, setFormEquipo] = useState<Partial<Record<Rol, string>>>({});
  const [formDatosPreop, setFormDatosPreop] = useState<Record<string, string>>({});

  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [exito, setExito] = useState<{ id: string; esHoy: boolean } | null>(null);

  // Carga inicial de datos maestros
  useEffect(() => {
    let activo = true;
    Promise.allSettled([
      api<Quirofano[]>('/api/quirofanos'),
      api<ProtocoloResumen[]>('/api/protocolos'),
      api<Integrante[]>('/api/personal'),
    ]).then(([resQ, resP, resPers]) => {
      if (!activo) return;
      let despliegue = false;
      let err: string | null = null;

      if (resQ.status === 'fulfilled') {
        const qs = Array.isArray(resQ.value) ? resQ.value : [];
        setQuirofanos(qs);
        if (qs.length > 0 && !formQuirofano) {
          setFormQuirofano(qs[0].id);
        }
      } else {
        const msg = resQ.reason instanceof Error ? resQ.reason.message : String(resQ.reason);
        if (/404|not found|no encontrad/i.test(msg)) despliegue = true;
        else err = msg;
      }

      if (resP.status === 'fulfilled') {
        const ps = Array.isArray(resP.value) ? resP.value : [];
        setProtocolos(ps);
        if (ps.length > 0 && !formProtocolo) {
          setFormProtocolo(ps[0].id);
        }
      } else {
        const msg = resP.reason instanceof Error ? resP.reason.message : String(resP.reason);
        if (/404|not found|no encontrad/i.test(msg)) despliegue = true;
        else if (!err) err = msg;
      }

      if (resPers.status === 'fulfilled') {
        setPersonal(Array.isArray(resPers.value) ? resPers.value : []);
      } else {
        const msg = resPers.reason instanceof Error ? resPers.reason.message : String(resPers.reason);
        if (/404|not found|no encontrad/i.test(msg)) despliegue = true;
        else if (!err) err = msg;
      }

      if (despliegue) setDesplegandoMaestros(true);
      if (err) setErrorMaestros(err);
    });

    return () => {
      activo = false;
    };
  }, []);

  // Carga de la agenda según la fecha seleccionada
  const recargarAgenda = (fechaConsulta: string) => {
    setCargando(true);
    setErrorAgenda(null);
    setDesplegandoAgenda(false);

    api<CirugiaAgenda[]>(`/api/agenda?fecha=${fechaConsulta}`)
      .then(ag => {
        setAgenda(Array.isArray(ag) ? ag : []);
      })
      .catch((err: Error) => {
        if (/404|not found|no encontrad/i.test(err.message)) {
          setDesplegandoAgenda(true);
        } else {
          setErrorAgenda(err.message);
        }
      })
      .finally(() => {
        setCargando(false);
      });
  };

  useEffect(() => {
    recargarAgenda(fecha);
  }, [fecha]);

  // Mantener sincronizada la fecha del formulario con la fecha vista en la agenda por defecto
  const cambiarFechaVista = (nuevaFecha: string) => {
    setFecha(nuevaFecha);
    setFormFecha(nuevaFecha);
  };

  // Protocolo seleccionado para obtener sus campos_preop y saber si es Cardiovascular
  const protocoloSel = protocolos.find(p => p.id === formProtocolo);
  const esCardiovascular = protocoloSel
    ? /cardiovascular/i.test(protocoloSel.especialidad)
    : false;

  // Limpiar formulario manteniendo quirofano y fecha
  const limpiarFormulario = () => {
    setFormTipoDoc('CC');
    setFormNumDoc('');
    setFormNombre('');
    setFormFechaNac('');
    setFormEps('');
    setFormHc('');
    setFormProcedimiento('');
    setFormDiagnostico('');
    setFormLateralidad('No aplica');
    setFormEquipo({});
    setFormDatosPreop({});
    setErrorEnvio(null);
  };

  // Envío del formulario
  const handleProgramar = async (e: FormEvent) => {
    e.preventDefault();
    setErrorEnvio(null);
    setExito(null);

    if (!formQuirofano) {
      setErrorEnvio('Seleccione un quirófano.');
      return;
    }
    if (!formFecha) {
      setErrorEnvio('Seleccione la fecha de la cirugía.');
      return;
    }
    if (!formHora) {
      setErrorEnvio('Seleccione la hora de inicio.');
      return;
    }
    if (!formProtocolo) {
      setErrorEnvio('Seleccione una especialidad.');
      return;
    }
    if (!formNombre.trim() || !formNumDoc.trim()) {
      setErrorEnvio('Ingrese el nombre y documento del paciente.');
      return;
    }
    if (!formProcedimiento.trim()) {
      setErrorEnvio('Ingrese el procedimiento.');
      return;
    }

    const isoFecha = aIsoBogota(formFecha, formHora);
    if (!isoFecha) {
      setErrorEnvio('Fecha u hora de cirugía inválida.');
      return;
    }

    const datosPreopPayload: Record<string, string | number | null> = {};
    if (protocoloSel) {
      for (const campo of protocoloSel.campos_preop) {
        const val = formDatosPreop[campo.id]?.trim();
        if (!val) {
          datosPreopPayload[campo.id] = null;
        } else if (campo.tipo === 'numero') {
          const num = Number(val.replace(',', '.'));
          datosPreopPayload[campo.id] = isNaN(num) ? null : num;
        } else {
          datosPreopPayload[campo.id] = val;
        }
      }
    }

    const equipoPayload: Partial<Record<Rol, string>> = {};
    const rolesRequeridos: Rol[] = ['cirujano', 'anestesiologo', 'instrumentador', 'auxiliar_enfermeria'];
    if (esCardiovascular) rolesRequeridos.push('perfusionista');

    for (const r of rolesRequeridos) {
      const id = formEquipo[r];
      if (id) equipoPayload[r] = id;
    }

    const payload: NuevaCirugia = {
      quirofano_id: formQuirofano,
      protocolo_id: formProtocolo,
      fecha_programada: isoFecha,
      duracion_min: Number(formDuracion) || 60,
      paciente: {
        tipo_doc: formTipoDoc,
        num_doc: formNumDoc.trim(),
        nombre: formNombre.trim(),
        fecha_nacimiento: formFechaNac,
        eps: formEps.trim(),
        hc: formHc.trim(),
      },
      procedimiento: formProcedimiento.trim(),
      diagnostico: formDiagnostico.trim(),
      lateralidad: formLateralidad,
      equipo_programado: equipoPayload,
      datos_preop: datosPreopPayload,
    };

    setEnviando(true);
    try {
      const res = await api<{ id: string }>('/api/cirugias', payload);
      setExito({ id: res.id, esHoy: formFecha === hoyBogota(ahora) });
      limpiarFormulario();
      setFecha(formFecha);
      recargarAgenda(formFecha);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      if (/404|not found|no encontrad/i.test(mensaje)) {
        setErrorEnvio('Esta función se está desplegando');
      } else {
        setErrorEnvio(mensaje);
      }
    } finally {
      setEnviando(false);
    }
  };

  // Cálculo de la línea de tiempo actual en Bogotá
  const hoy = hoyBogota(ahora);
  const esHoy = fecha === hoy;
  const bogotaAhora = new Date(ahora - 5 * 3600 * 1000);
  const minDesde7 = (bogotaAhora.getUTCHours() - 7) * 60 + bogotaAhora.getUTCMinutes();
  const lineaRojaTop = Math.round(minDesde7 * (80 / 60));
  const mostrarLineaRoja = esHoy && minDesde7 >= 0 && minDesde7 <= 12 * 60;

  const desplegando = desplegandoMaestros || desplegandoAgenda;
  const errorCarga = errorMaestros ?? errorAgenda;

  const numQuirofanos = Math.max(quirofanos.length, 1);
  const gridTemplate = `64px repeat(${numQuirofanos}, minmax(0, 1fr))`;

  return (
    <div className="prog-pagina">
      <CabeceraGestion yo={yo} actual="programacion" />

      <main className="prog-main">
        {/* Columna Izquierda: Agenda del día */}
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
                onClick={() => cambiarFechaVista(sumarDias(fecha, -1))}
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
                  onChange={e => e.target.value && cambiarFechaVista(e.target.value)}
                  style={{ width: 'auto' }}
                />
              </label>
              <button
                type="button"
                className="pg btn"
                aria-label="Día siguiente"
                onClick={() => cambiarFechaVista(sumarDias(fecha, 1))}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => cambiarFechaVista(hoyBogota(ahora))}
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
              <div className="prog-grid-encabezado" style={{ gridTemplateColumns: quirofanos.length > 0 ? gridTemplate : '64px 1fr' }}>
                <span />
                {quirofanos.length > 0 ? (
                  quirofanos.map(q => (
                    <span
                      key={q.id}
                      className="d"
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        padding: '0 12px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {q.nombre}
                    </span>
                  ))
                ) : (
                  <span className="d" style={{ fontSize: 17, fontWeight: 600, padding: '0 12px' }}>
                    Quirófanos
                  </span>
                )}
              </div>

              <div className="prog-grid-cuerpo" style={{ gridTemplateColumns: quirofanos.length > 0 ? gridTemplate : '64px 1fr' }}>
                {/* Columna de marcas horarias */}
                <div className="prog-col-horas">
                  {HORAS_AGENDA.map((h, i) => (
                    <span key={h} className="prog-hora-lbl" style={{ top: i * 80 }}>
                      {String(h).padStart(2, '0')}:00
                    </span>
                  ))}
                </div>

                {/* Línea roja de hora actual (detrás de los bloques, z-index: 0) */}
                {mostrarLineaRoja && (
                  <div aria-hidden="true" className="prog-linea-ahora" style={{ top: lineaRojaTop }}>
                    <span className="prog-linea-ahora-punto" />
                  </div>
                )}

                {/* Columnas por quirófano */}
                {quirofanos.length > 0 ? (
                  quirofanos.map(q => {
                    const cirugiasQ = agenda.filter(c => c.quirofano_id === q.id || c.quirofano === q.nombre);
                    return (
                      <div
                        key={q.id}
                        className="prog-col-quirofano"
                        onClick={ev => {
                          const rect = ev.currentTarget.getBoundingClientRect();
                          const clickY = ev.clientY - rect.top;
                          const minutosDesde7 = Math.max(0, Math.floor(clickY / (80 / 30)) * 30);
                          const h = Math.min(20, Math.floor(minutosDesde7 / 60) + 7);
                          const m = minutosDesde7 % 60;
                          const hh = String(h).padStart(2, '0');
                          const mm = String(m).padStart(2, '0');
                          setFormHora(`${hh}:${mm}`);
                          setFormQuirofano(q.id);
                        }}
                      >
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
                              onClick={ev => ev.stopPropagation()}
                            >
                              <span className="prog-bloque-horas">{ini} a {fin}</span>
                              <span className="prog-bloque-proc">{c.procedimiento}</span>
                              <span className="prog-bloque-paciente">{c.paciente}</span>
                            </a>
                          );
                        })}
                      </div>
                    );
                  })
                ) : (
                  <div
                    className="prog-col-quirofano"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 24px',
                      color: 'var(--tenue)',
                      textAlign: 'center',
                    }}
                  >
                    {desplegando
                      ? 'Esta función se está desplegando. Los quirófanos aparecerán aquí cuando el servicio esté listo.'
                      : (cargando ? 'Cargando quirófanos…' : 'No hay quirófanos registrados.')}
                  </div>
                )}
              </div>
            </div>

            <p style={{ margin: '18px 0 0', fontSize: 14, color: 'var(--tenue)' }}>
              La línea roja es la hora actual. Toque una franja libre para programar a esa hora.
            </p>
          </section>
        </div>

        {/* Panel Derecho: Nueva cirugía */}
        <aside aria-labelledby="titulo-nueva" className="prog-pn prog-aside">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h2 id="titulo-nueva" className="d" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
              Nueva cirugía
            </h2>
            <button
              type="button"
              className="btn"
              aria-label="Limpiar formulario"
              style={{ minWidth: 44, padding: 0, border: 0 }}
              onClick={() => {
                limpiarFormulario();
                setExito(null);
                setErrorEnvio(null);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {exito && (
            <div className="prog-exito" role="status">
              <span>Cirugía programada.</span>
              {exito.esHoy && (
                <a
                  href={`/sesion/${exito.id}`}
                  className="btn btn-primario"
                  style={{ minHeight: 36, padding: '0 12px', fontSize: 13 }}
                >
                  Abrir sesión
                </a>
              )}
            </div>
          )}

          {errorEnvio && (
            <div className="prog-error" role="alert">
              {errorEnvio}
            </div>
          )}

          <form onSubmit={handleProgramar} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Cuándo y dónde */}
            <fieldset className="prog-fieldset">
              <legend className="prog-legend">Cuándo y dónde</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 1fr', gap: 10 }}>
                <label className="prog-fl">
                  Quirófano
                  <select
                    value={formQuirofano}
                    onChange={e => setFormQuirofano(e.target.value)}
                    required
                  >
                    {quirofanos.length === 0 && <option value="">Sin quirófanos</option>}
                    {quirofanos.map(q => (
                      <option key={q.id} value={q.id}>{q.nombre}</option>
                    ))}
                  </select>
                </label>
                <label className="prog-fl">
                  Fecha
                  <input
                    type="date"
                    value={formFecha}
                    onChange={e => setFormFecha(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label className="prog-fl">
                  Inicia
                  <select
                    value={formHora}
                    onChange={e => setFormHora(e.target.value)}
                  >
                    {HORAS_INICIO.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </label>
                <label className="prog-fl">
                  Dura
                  <select
                    value={formDuracion}
                    onChange={e => setFormDuracion(Number(e.target.value))}
                  >
                    {DURACIONES.map(([min, etiqueta]) => (
                      <option key={min} value={min}>{etiqueta}</option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>

            {/* Paciente */}
            <fieldset className="prog-fieldset">
              <legend className="prog-legend">Paciente</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr)', gap: 10 }}>
                <label className="prog-fl">
                  Tipo doc.
                  <select
                    value={formTipoDoc}
                    onChange={e => setFormTipoDoc(e.target.value)}
                  >
                    {TIPOS_DOC.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="prog-fl">
                  Número
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ej: 1045667210"
                    value={formNumDoc}
                    onChange={e => setFormNumDoc(e.target.value)}
                    required
                  />
                </label>
              </div>

              <label className="prog-fl">
                Nombre completo
                <input
                  type="text"
                  placeholder="Nombre del paciente"
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                <label className="prog-fl">
                  Nacimiento
                  <input
                    type="date"
                    value={formFechaNac}
                    onChange={e => setFormFechaNac(e.target.value)}
                  />
                </label>
                <label className="prog-fl">
                  EPS
                  <input
                    type="text"
                    placeholder="Ej: Sura"
                    value={formEps}
                    onChange={e => setFormEps(e.target.value)}
                  />
                </label>
                <label className="prog-fl">
                  HC
                  <input
                    type="text"
                    placeholder="Nº historia"
                    value={formHc}
                    onChange={e => setFormHc(e.target.value)}
                  />
                </label>
              </div>
            </fieldset>

            {/* Procedimiento */}
            <fieldset className="prog-fieldset">
              <legend className="prog-legend">Procedimiento</legend>
              <label className="prog-fl">
                Especialidad
                <select
                  value={formProtocolo}
                  onChange={e => setFormProtocolo(e.target.value)}
                  required
                >
                  {protocolos.length === 0 && <option value="">Sin protocolos</option>}
                  {protocolos.map(p => (
                    <option key={p.id} value={p.id}>{p.especialidad}</option>
                  ))}
                </select>
                <span className="prog-ay">Define el checklist, los datos previos y el material a contar.</span>
              </label>

              <label className="prog-fl">
                Procedimiento
                <input
                  type="text"
                  placeholder="Ej: Colecistectomía laparoscópica"
                  value={formProcedimiento}
                  onChange={e => setFormProcedimiento(e.target.value)}
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px', gap: 10 }}>
                <label className="prog-fl">
                  Diagnóstico
                  <input
                    type="text"
                    placeholder="Ej: Colelitiasis"
                    value={formDiagnostico}
                    onChange={e => setFormDiagnostico(e.target.value)}
                  />
                </label>
                <label className="prog-fl">
                  Lateralidad
                  <select
                    value={formLateralidad}
                    onChange={e => setFormLateralidad(e.target.value)}
                  >
                    {LATERALIDADES.map(lat => (
                      <option key={lat} value={lat}>{lat}</option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>

            {/* Equipo */}
            <fieldset className="prog-fieldset">
              <legend className="prog-legend">Equipo</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {(['cirujano', 'anestesiologo', 'instrumentador', 'auxiliar_enfermeria'] as Rol[]).map(rol => {
                  const integrantesRol = personal.filter(p => p.rol === rol);
                  return (
                    <label key={rol} className="prog-fl">
                      {ROLES[rol]}
                      <select
                        value={formEquipo[rol] ?? ''}
                        onChange={e => setFormEquipo({ ...formEquipo, [rol]: e.target.value })}
                      >
                        <option value="">Seleccionar...</option>
                        {integrantesRol.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>

              {esCardiovascular && (
                <label className="prog-fl" style={{ marginTop: 2 }}>
                  Perfusionista
                  <select
                    value={formEquipo.perfusionista ?? ''}
                    onChange={e => setFormEquipo({ ...formEquipo, perfusionista: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    {personal.filter(p => p.rol === 'perfusionista').map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </label>
              )}
            </fieldset>

            {/* Datos antes de la cirugía */}
            {protocoloSel && protocoloSel.campos_preop.length > 0 && (
              <fieldset className="prog-fieldset">
                <legend className="prog-legend">Datos antes de la cirugía</legend>
                <span className="prog-ay" style={{ marginTop: -8 }}>
                  Los pide el protocolo de la especialidad elegida.
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                  {protocoloSel.campos_preop.map(campo => (
                    <label key={campo.id} className="prog-fl">
                      <span>
                        {campo.etiqueta}
                        {campo.unidad ? ` (${campo.unidad})` : ''}
                        {campo.obligatorio && (
                          <span style={{ color: 'var(--aviso-txt)', marginLeft: 4, fontWeight: 400 }}>
                            (obligatorio)
                          </span>
                        )}
                      </span>
                      <input
                        type="text"
                        inputMode={campo.tipo === 'numero' ? 'decimal' : 'text'}
                        value={formDatosPreop[campo.id] ?? ''}
                        onChange={e =>
                          setFormDatosPreop({ ...formDatosPreop, [campo.id]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>

                <span className="prog-ay">
                  Lo que falte se puede completar después; la tablet lo mostrará como pendiente antes del ingreso.
                </span>
              </fieldset>
            )}

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button
                type="submit"
                className="btn btn-primario"
                disabled={enviando}
              >
                {enviando ? 'Programando…' : 'Programar cirugía'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  limpiarFormulario();
                  setExito(null);
                  setErrorEnvio(null);
                }}
              >
                Limpiar
              </button>
            </div>
          </form>
        </aside>
      </main>
    </div>
  );
}
