import { useEffect, useState } from 'react';
import type { EstadoCirugia, Evento, HoraId, Sesion as Usuario } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { CabeceraGestion, esCoordinacion } from './CabeceraGestion.tsx';
import { csvConsumo, descargar } from './gestion.ts';
import { describir, hora, ROLES } from './etiquetas.ts';
import './trazabilidad.css';

function calcularMinutos(desde?: string | null, hasta?: string | null): number | null {
  if (!desde || !hasta) return null;
  const ms = new Date(hasta).getTime() - new Date(desde).getTime();
  return ms > 0 ? Math.round(ms / 60000) : null;
}

function formatearMinutos(m: number | null | undefined): string {
  if (m === null || m === undefined || isNaN(m)) return '—';
  const horas = Math.floor(m / 60);
  const mins = Math.round(m % 60);
  if (horas === 0) return `${mins} min`;
  if (mins === 0) return `${horas} h`;
  return `${horas} h ${mins} min`;
}

type FaseClave = 'entrada' | 'inicio' | 'durante' | 'salida';

function faseDeEvento(e: Evento, horas: Partial<Record<HoraId, string>>): FaseClave {
  if (e.datos.tipo === 'hora') {
    if (e.datos.hora === 'ingreso') return 'entrada';
    if (e.datos.hora === 'anestesia') return 'inicio';
    if (e.datos.hora === 'inicio_cirugia') return 'durante';
    if (e.datos.hora === 'fin_cirugia') return 'durante';
    if (e.datos.hora === 'salida_recuperacion') return 'salida';
  }
  if (e.datos.tipo === 'check') {
    if (e.datos.fase === 'antes_anestesia') return 'entrada';
    if (e.datos.fase === 'antes_incision') return 'inicio';
    if (e.datos.fase === 'antes_salida') return 'salida';
  }
  const ts = e.ts;
  if (horas.anestesia && ts < horas.anestesia) return 'entrada';
  if (horas.inicio_cirugia && ts < horas.inicio_cirugia) return 'inicio';
  if (horas.fin_cirugia && ts <= horas.fin_cirugia) return 'durante';
  if (horas.fin_cirugia && ts > horas.fin_cirugia) return 'salida';
  if (horas.inicio_cirugia && ts >= horas.inicio_cirugia) return 'durante';
  if (horas.anestesia && ts >= horas.anestesia) return 'inicio';
  return 'entrada';
}

export function Trazabilidad({ cirugiaId, yo }: { cirugiaId: string; yo: Usuario }) {
  const [estado, setEstado] = useState<EstadoCirugia | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // registrado_por es un id de usuario: se muestra el nombre de la persona.
  const [nombres, setNombres] = useState<Record<string, string>>({});
  useEffect(() => {
    api<{ id: string; nombre: string }[]>('/api/personal')
      .then(p => setNombres(Object.fromEntries(p.map(x => [x.id, x.nombre]))))
      .catch(() => { /* sin nombres se muestra «Usuario» */ });
  }, []);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    api<EstadoCirugia>(`/api/cirugias/${cirugiaId}`)
      .then(est => {
        if (!activo) return;
        setEstado(est);
        return api<Evento[]>(`/api/cirugias/${cirugiaId}/eventos`)
          .then(evs => {
            if (!activo) return;
            setEventos(evs);
            setCargando(false);
          })
          .catch(() => {
            if (!activo) return;
            setEventos(est.eventos);
            setCargando(false);
          });
      })
      .catch(err => {
        if (!activo) return;
        setError(err instanceof Error ? err.message : 'Error al cargar la cirugía');
        setCargando(false);
      });

    return () => { activo = false; };
  }, [cirugiaId]);

  if (cargando) {
    return (
      <div className="traza-pagina">
        <CabeceraGestion yo={yo} actual="otra" />
        <main className="traza-main">
          <div className="traza-cargando">Cargando trazabilidad…</div>
        </main>
      </div>
    );
  }

  if (error || !estado) {
    return (
      <div className="traza-pagina">
        <CabeceraGestion yo={yo} actual="otra" />
        <main className="traza-main">
          <div className="traza-error" role="alert">{error ?? 'Cirugía no encontrada'}</div>
        </main>
      </div>
    );
  }

  const c = estado.cirugia;
  const fecha = new Date(c.fecha_programada).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Bogota',
  });
  const horaInicio = estado.horas.ingreso ? hora(estado.horas.ingreso) : hora(c.fecha_programada);
  const horaFin = estado.horas.salida_recuperacion
    ? hora(estado.horas.salida_recuperacion)
    : estado.horas.fin_cirugia
    ? hora(estado.horas.fin_cirugia)
    : null;
  const horario = horaFin ? `de ${horaInicio} a ${horaFin}` : `desde las ${horaInicio}`;

  const onDescargarConsumo = () => {
    const proc = c.procedimiento.toLowerCase().replace(/\s+/g, '-');
    descargar(`consumo-${proc}.csv`, csvConsumo(estado));
  };

  // Cálculo del Resumen
  const totalItems = estado.protocolo.fases.reduce((acc, f) => acc + f.items.length, 0);
  const checksVerificados = Object.values(estado.checks).filter(k => k.valor === 'si').length;
  const vigentesList = eventos.filter(e => e.datos.tipo !== 'anulacion');
  const porVoz = vigentesList.filter(e => e.origen === 'voz').length;
  const porManual = vigentesList.filter(e => e.origen === 'manual').length;

  const pendientesCount = totalItems - checksVerificados;
  const esCierreCompleto = pendientesCount === 0 && Boolean(estado.horas.salida_recuperacion);

  const resueltas = estado.alertas.filter(a => a.estado === 'resuelta').length;
  const cerradas = estado.alertas.filter(a => a.estado === 'cerrada').length;
  const abiertas = estado.alertas.filter(a => a.estado === 'abierta').length;

  const solNovedades = estado.novedades.filter(n => n.estado === 'solucionada');
  const tiempoSolucion = solNovedades[0]?.solucionada_ts && solNovedades[0]?.ts
    ? Math.max(1, Math.round((new Date(solNovedades[0].solucionada_ts).getTime() - new Date(solNovedades[0].ts).getTime()) / 60000))
    : null;
  const primeraNovedad = estado.novedades[0];

  // Mapeo de anulaciones
  const mapaAnulaciones = new Map<string, Evento>();
  for (const e of eventos) {
    if (e.datos.tipo === 'anulacion') {
      mapaAnulaciones.set(e.datos.evento_id, e);
    }
  }

  // Agrupación por fases
  const eventosPorFase: Record<FaseClave, Evento[]> = {
    entrada: [],
    inicio: [],
    durante: [],
    salida: [],
  };

  for (const e of eventos) {
    if (e.datos.tipo === 'anulacion') continue;
    const fase = faseDeEvento(e, estado.horas);
    eventosPorFase[fase].push(e);
  }

  const fasesInfo: { id: FaseClave; nombre: string; rango: string; eventos: Evento[] }[] = [
    {
      id: 'entrada',
      nombre: 'Entrada, antes de la anestesia',
      rango: estado.horas.ingreso && estado.horas.anestesia
        ? `${hora(estado.horas.ingreso)} a ${hora(estado.horas.anestesia)}`
        : estado.horas.ingreso
        ? `Desde las ${hora(estado.horas.ingreso)}`
        : '',
      eventos: eventosPorFase.entrada,
    },
    {
      id: 'inicio',
      nombre: 'Inicio, antes de la incisión',
      rango: estado.horas.anestesia && estado.horas.inicio_cirugia
        ? `${hora(estado.horas.anestesia)} a ${hora(estado.horas.inicio_cirugia)}`
        : estado.horas.anestesia
        ? `Desde las ${hora(estado.horas.anestesia)}`
        : '',
      eventos: eventosPorFase.inicio,
    },
    {
      id: 'durante',
      nombre: 'Durante la cirugía',
      rango: estado.horas.inicio_cirugia && estado.horas.fin_cirugia
        ? `${hora(estado.horas.inicio_cirugia)} a ${hora(estado.horas.fin_cirugia)}`
        : estado.horas.inicio_cirugia
        ? `Desde las ${hora(estado.horas.inicio_cirugia)}`
        : '',
      eventos: eventosPorFase.durante,
    },
    {
      id: 'salida',
      nombre: 'Salida, antes de salir del quirófano',
      rango: estado.horas.fin_cirugia && estado.horas.salida_recuperacion
        ? `${hora(estado.horas.fin_cirugia)} a ${hora(estado.horas.salida_recuperacion)}`
        : estado.horas.fin_cirugia
        ? `Desde las ${hora(estado.horas.fin_cirugia)}`
        : '',
      eventos: eventosPorFase.salida,
    },
  ];

  // Tiempos calculados
  const tEntrada = calcularMinutos(estado.horas.ingreso, estado.horas.anestesia);
  const tInicio = calcularMinutos(estado.horas.anestesia, estado.horas.inicio_cirugia);
  const tDurante = calcularMinutos(estado.horas.inicio_cirugia, estado.horas.fin_cirugia);
  const tSalida = calcularMinutos(estado.horas.fin_cirugia, estado.horas.salida_recuperacion);

  return (
    <div className="traza-pagina">
      <CabeceraGestion yo={yo} actual="otra" />

      <main className="traza-main">
        <nav aria-label="Ruta" className="traza-ruta">
          <a href={esCoordinacion(yo) ? '/panel' : '/'}>
            {esCoordinacion(yo) ? 'Panel de gestión' : 'Cirugías de hoy'}
          </a>{' '}
          / Trazabilidad
        </nav>

        <div className="traza-cabecera-cirugia">
          <div className="traza-titulos">
            <h1>{c.procedimiento}</h1>
            <span className="traza-subtitulo">
              {c.paciente.nombre}
              {c.paciente.edad ? `, ${c.paciente.edad} años` : ''}. {c.quirofano}, {fecha}, {horario}.
            </span>
          </div>
          <div className="traza-acciones">
            <a href={`/sesion/${cirugiaId}`} className="traza-btn-sesion">
              Abrir sesión
            </a>
            <button type="button" className="traza-btn-csv" onClick={onDescargarConsumo}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              Consumo (CSV)
            </button>
            <a href={`/reporte/${cirugiaId}?imprimir=1`} target="_blank" rel="noopener" className="traza-btn-sesion">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M9 15h6" /></svg>
              Reporte de consumo (PDF)
            </a>
          </div>
        </div>

        {/* Resumen */}
        <section aria-label="Resumen" className="traza-pn traza-resumen-card">
          <div className="traza-resumen-grid">
            <div className="traza-resumen-item">
              <span className="traza-resumen-pregunta">¿Quién verificó?</span>
              <span className="traza-resumen-valor">
                {checksVerificados} de {totalItems} con nombre, rol y hora
              </span>
              <span className="traza-resumen-detalle">
                {porVoz} por voz, {porManual} a mano.
              </span>
            </div>

            <div className="traza-resumen-item">
              <span className="traza-resumen-pregunta">¿Qué quedó pendiente?</span>
              {esCierreCompleto ? (
                <span className="traza-resumen-valor verde">Nada al cierre</span>
              ) : pendientesCount === 0 ? (
                <span className="traza-resumen-valor verde">Al día</span>
              ) : (
                <span className="traza-resumen-valor">
                  {pendientesCount} {pendientesCount === 1 ? 'pendiente' : 'pendientes'}
                </span>
              )}
              <span className="traza-resumen-detalle">
                {pendientesCount === 0
                  ? `Las ${estado.protocolo.fases.length} pausas, completas antes de su hora.`
                  : 'Pendiente de verificar antes de continuar.'}
              </span>
            </div>

            <div className="traza-resumen-item">
              <span className="traza-resumen-pregunta">¿Qué alertas hubo?</span>
              <span className="traza-resumen-valor">
                {abiertas > 0
                  ? `${abiertas} abierta${abiertas > 1 ? 's' : ''}`
                  : resueltas > 0 || cerradas > 0
                  ? `${resueltas} resuelta${resueltas !== 1 ? 's' : ''} a tiempo`
                  : 'Sin alertas'}
              </span>
              <span className="traza-resumen-detalle">
                {abiertas > 0
                  ? `${resueltas} resueltas, ${cerradas} con motivo.`
                  : cerradas === 0
                  ? 'Ninguna cerrada con motivo.'
                  : `${cerradas} cerrada${cerradas > 1 ? 's' : ''} con motivo.`}
              </span>
            </div>

            <div className="traza-resumen-item">
              <span className="traza-resumen-pregunta">¿Cuándo se solucionó?</span>
              <span className="traza-resumen-valor">
                {estado.novedades.length > 0
                  ? `${estado.novedades.length} novedad${estado.novedades.length > 1 ? 'es' : ''}${
                      tiempoSolucion ? `, en ${tiempoSolucion} min` : ''
                    }`
                  : 'Sin novedades'}
              </span>
              <span className="traza-resumen-detalle">
                {primeraNovedad
                  ? `${primeraNovedad.texto}${
                      primeraNovedad.solucionada_ts
                        ? `, ${hora(primeraNovedad.ts)} a ${hora(primeraNovedad.solucionada_ts)}.`
                        : '.'
                    }`
                  : 'Cirugía sin incidentes reportados.'}
              </span>
            </div>
          </div>
        </section>

        {/* Layout de 2 columnas */}
        <div className="traza-lay">
          {/* Columna Izquierda */}
          <div className="traza-col-izq">
            {/* Registro cronológico */}
            <section aria-labelledby="registro-titulo" className="traza-pn traza-registro-card">
              <div className="traza-registro-cab">
                <h2 id="registro-titulo">Registro cronológico</h2>
                <span>Nada se borra: lo anulado queda tachado.</span>
              </div>

              <div className="traza-tabla-scroll">
                <div className="traza-tabla-min">
                  <div className="traza-ev traza-ev-encabezado">
                    <span>Hora</span>
                    <span>Qué pasó</span>
                    <span>Quién</span>
                    <span>Origen</span>
                  </div>

                  {fasesInfo
                    .filter(f => f.eventos.length > 0 || (f.id === 'entrada' && estado.horas.ingreso))
                    .map(fase => (
                      <div key={fase.id} className="traza-fase-bloque">
                        <div className="traza-gh">
                          <h3>{fase.nombre}</h3>
                          {fase.rango && <span>{fase.rango}</span>}
                        </div>

                        {fase.eventos.map(e => {
                          const anulacion = mapaAnulaciones.get(e.id);
                          const estaAnulado = Boolean(anulacion);

                          return (
                            <div
                              key={e.id}
                              className={`traza-ev${estaAnulado ? ' traza-ev-anulado' : ''}`}
                            >
                              <span style={estaAnulado ? { textDecoration: 'line-through' } : undefined}>
                                {hora(e.ts)}
                              </span>

                              <span>
                                <span style={estaAnulado ? { textDecoration: 'line-through' } : undefined}>
                                  {describir(e.datos, estado.protocolo)}
                                </span>
                                {estaAnulado ? (
                                  <span className="traza-q">
                                    Anulado a las {hora(anulacion!.ts)} por {nombres[anulacion!.registrado_por ?? ''] ?? 'un usuario'}.
                                    {anulacion!.texto ? ` ${anulacion!.texto}` : ''}
                                  </span>
                                ) : (
                                  e.texto ? <span className="traza-q">«{e.texto}»</span> : null
                                )}
                              </span>

                              <span className="traza-w">
                                <span>{e.registrado_por ? nombres[e.registrado_por] ?? 'Usuario' : 'Sistema'}</span>
                                {e.rol_confirma && (
                                  <span style={{ color: '#4D6170' }}>
                                    {ROLES[e.rol_confirma]
                                      ? `confirma ${ROLES[e.rol_confirma].toLowerCase()}`
                                      : e.rol_confirma}
                                  </span>
                                )}
                              </span>

                              {estaAnulado ? (
                                <span className="traza-badge-anulado">Anulado</span>
                              ) : e.origen === 'voz' ? (
                                <span className="traza-badge-voz">
                                  Voz{e.confianza != null ? ` ${e.confianza.toFixed(2).replace('.', ',')}` : ''}
                                </span>
                              ) : e.origen === 'camara' ? (
                                <span className="traza-badge-voz">Cámara</span>
                              ) : !e.registrado_por ? (
                                <span className="traza-badge-alerta">Alerta</span>
                              ) : (
                                <span className="traza-badge-mano">A mano</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                </div>
              </div>
            </section>

            {/* Consumo de la cirugía */}
            <section aria-labelledby="consumo-titulo" className="traza-pn traza-consumo-card">
              <div className="traza-consumo-cabecera">
                <div>
                  <h2 id="consumo-titulo">Consumo de la cirugía</h2>
                  <span className="traza-consumo-subtitulo">
                    {estado.consumo.length}{' '}
                    {estado.consumo.length === 1 ? 'insumo registrado' : 'insumos registrados'}
                  </span>
                </div>
                <button type="button" className="traza-btn-csv" onClick={onDescargarConsumo}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 3v12" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M5 21h14" />
                  </svg>
                  Descargar consumo (CSV)
                </button>
                <a href={`/reporte/${cirugiaId}?imprimir=1`} target="_blank" rel="noopener" className="traza-btn-sesion">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M9 15h6" /></svg>
                  Descargar reporte (PDF)
                </a>
              </div>

              {estado.consumo.length === 0 ? (
                <p className="traza-vacio">No hay insumos registrados en el consumo.</p>
              ) : (
                <div className="traza-tabla-wrapper">
                  <table className="traza-tabla">
                    <thead>
                      <tr>
                        <th>Insumo</th>
                        <th>Cantidad</th>
                        <th>Origen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estado.consumo.map((linea, idx) => (
                        <tr key={`${linea.insumo}-${idx}`}>
                          <td className="traza-insumo-nombre">{linea.insumo}</td>
                          <td className="traza-insumo-cant">{linea.cantidad}</td>
                          <td>
                            <span className={linea.del_conteo ? 'traza-badge-conteo' : 'traza-badge-registrado'}>
                              {linea.del_conteo ? 'Del conteo' : 'Registrado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Columna Derecha (Aside) */}
          <aside className="traza-aside">
            {/* Alertas */}
            <section aria-labelledby="alertas-titulo" className="traza-pn">
              <h2 id="alertas-titulo">Alertas</h2>
              {estado.alertas.length === 0 ? (
                <p className="traza-vacio">Sin alertas registradas en este procedimiento.</p>
              ) : (
                estado.alertas.map(a => {
                  const duracionMin = a.hasta
                    ? Math.max(1, Math.round((new Date(a.hasta).getTime() - new Date(a.desde).getTime()) / 60000))
                    : null;

                  return (
                    <div key={a.id} className="traza-al">
                      {a.estado === 'resuelta' ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#0B6B5A"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-label="Resuelta"
                        >
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      ) : a.estado === 'cerrada' ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#0B5D8C"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-label="Cerrada con motivo"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4" />
                          <path d="M12 8h.01" />
                        </svg>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#C8372D"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-label="Abierta"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      )}

                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 600 }}>{a.mensaje}</span>
                        <span style={{ fontSize: 14, color: '#4D6170' }}>
                          {a.estado === 'resuelta'
                            ? `Resuelta${duracionMin ? ` en ${duracionMin} min,` : ''} ${hora(a.desde)} a ${hora(a.hasta)}`
                            : a.estado === 'cerrada'
                            ? `Cerrada con motivo: ${a.motivo ?? 'Sin motivo'}`
                            : `Abierta desde las ${hora(a.desde)}`}
                        </span>
                      </span>
                    </div>
                  );
                })
              )}
            </section>

            {/* Novedades */}
            <section aria-labelledby="novedades-titulo" className="traza-pn">
              <h2 id="novedades-titulo">Novedades</h2>
              {estado.novedades.length === 0 ? (
                <p className="traza-vacio">Sin novedades reportadas.</p>
              ) : (
                estado.novedades.map(n => (
                  <div key={n.id} className="traza-novedad-item">
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{n.texto}</span>
                    <ol className="traza-timeline">
                      <li className="traza-timeline-paso">
                        <span className="traza-timeline-punto" />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 15 }}>
                          <span style={{ fontWeight: 600 }}>Detectada, {hora(n.ts)}</span>
                          <span style={{ fontSize: 14, color: '#4D6170' }}>Dictada en sala</span>
                        </span>
                      </li>
                      {n.responsable && (
                        <li className="traza-timeline-paso">
                          <span className="traza-timeline-punto" />
                          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 15 }}>
                            <span style={{ fontWeight: 600 }}>Atendida</span>
                            <span style={{ fontSize: 14, color: '#4D6170' }}>{n.responsable}</span>
                          </span>
                        </li>
                      )}
                      {n.estado === 'solucionada' && (
                        <li className="traza-timeline-paso">
                          <span className="traza-timeline-punto verde" />
                          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 15 }}>
                            <span style={{ fontWeight: 600 }}>
                              Solucionada{n.solucionada_ts ? `, ${hora(n.solucionada_ts)}` : ''}
                            </span>
                            <span style={{ fontSize: 14, color: '#4D6170' }}>
                              {n.acciones ?? 'Solucionada en sala'}
                            </span>
                          </span>
                        </li>
                      )}
                    </ol>
                  </div>
                ))
              )}
            </section>

            {/* Tiempos */}
            <section aria-labelledby="tiempos-titulo" className="traza-pn">
              <h2 id="tiempos-titulo">Tiempos</h2>
              <div className="traza-tiempo-fila">
                <span>Entrada</span>
                <strong>{formatearMinutos(tEntrada)}</strong>
              </div>
              <div className="traza-tiempo-fila">
                <span>Inicio</span>
                <strong>{formatearMinutos(tInicio)}</strong>
              </div>
              <div className="traza-tiempo-fila">
                <span>Durante</span>
                <strong>{formatearMinutos(tDurante)}</strong>
              </div>
              <div className="traza-tiempo-fila">
                <span>Salida</span>
                <strong>{formatearMinutos(tSalida)}</strong>
              </div>
              {estado.duraciones.map((d, i) => (
                <div key={i} className="traza-tiempo-fila">
                  <span>{d.nombre}</span>
                  <strong>{formatearMinutos(d.minutos)}</strong>
                </div>
              ))}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
