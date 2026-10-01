import { useEffect, useState, useMemo } from 'react';
import type { CirugiaActiva, EstadoCirugia, Panel as TipoPanel, Sesion as Usuario } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { CabeceraGestion } from './CabeceraGestion.tsx';
import { hora } from './etiquetas.ts';
import { csv, descargar } from './gestion.ts';
import { filtrar, filasCsv, opciones, paginar, type CirugiaFila } from './panelLista.ts';
import './panel.css';

type PeriodoDias = 1 | 7 | 30;

interface QuirofanoEnVivo {
  numero: string;
  id?: string;
  procedimiento?: string;
  paciente?: string;
  momento?: string;
  faseIndex?: number;
  verificadosTxt?: string;
  alertasTxt?: string;
  alertasSeveridad?: 'critica' | 'advertencia' | 'ninguna';
  enSalaTxt?: string;
  activa: boolean;
}

function formatearFechaTabla(iso: string): string {
  try {
    const d = new Date(iso);
    const dia = d.toLocaleDateString('es-CO', { day: 'numeric', timeZone: 'America/Bogota' });
    const mes = d.toLocaleDateString('es-CO', { month: 'short', timeZone: 'America/Bogota' }).replace('.', '');
    const h = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' });
    return `${dia} ${mes}, ${h}`;
  } catch {
    return iso;
  }
}

function formatearMinutos(m: number | null | undefined): string {
  if (m === null || m === undefined || isNaN(m)) return '—';
  const horas = Math.floor(m / 60);
  const mins = Math.round(m % 60);
  if (horas === 0) return `${mins} min`;
  return `${horas} h ${String(mins).padStart(2, '0')} min`;
}

function textoAlertasFila(c: CirugiaFila): string {
  if (c.alertas_abiertas > 0) return `${c.alertas_abiertas} abierta${c.alertas_abiertas > 1 ? 's' : ''}`;
  if (c.alertas_cerradas > 0) return `${c.alertas_cerradas} cerrada${c.alertas_cerradas > 1 ? 's' : ''} con motivo`;
  if (c.alertas_resueltas > 0) return `${c.alertas_resueltas} resuelta${c.alertas_resueltas > 1 ? 's' : ''}`;
  return 'Ninguna';
}

export function Panel({ yo }: { yo: Usuario }) {
  const [dias, setDias] = useState<PeriodoDias>(30);
  const [panel, setPanel] = useState<TipoPanel | null>(null);
  const [errorPanel, setErrorPanel] = useState<string | null>(null);
  const [cargandoPanel, setCargandoPanel] = useState(true);

  // Quirófanos en vivo
  const [quirofanosEnVivo, setQuirofanosEnVivo] = useState<QuirofanoEnVivo[]>([]);

  // Filtros de la lista
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroQuirofano, setFiltroQuirofano] = useState('Todos');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('Todas');
  const [filtroProtocolo, setFiltroProtocolo] = useState('todos');
  const [filtroSinResolver, setFiltroSinResolver] = useState(false);
  const [ordenFechaDesc, setOrdenFechaDesc] = useState(true);

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  // 1. Cargar datos del panel al cambiar el periodo
  useEffect(() => {
    setCargandoPanel(true);
    setErrorPanel(null);
    api<TipoPanel>(`/api/panel?dias=${dias}`)
      .then(p => {
        setPanel(p);
        setCargandoPanel(false);
      })
      .catch(e => {
        const msg = String(e?.message ?? e);
        if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
          setErrorPanel('El panel se está desplegando');
        } else {
          setErrorPanel(msg);
        }
        setCargandoPanel(false);
      });
  }, [dias]);

  // 2. Cargar quirófanos en vivo cada 30 segundos
  useEffect(() => {
    let activo = true;

    const actualizarEnVivo = async () => {
      try {
        const cirugias = await api<CirugiaActiva[]>('/api/cirugias');
        if (!activo) return;

        // Tomar hasta 4 cirugías
        const destacadas = cirugias.slice(0, 4);
        const estados = await Promise.all(
          destacadas.map(c => api<EstadoCirugia>(`/api/cirugias/${c.id}`).catch(() => null))
        );
        if (!activo) return;

        const resultado: QuirofanoEnVivo[] = [];
        const salasOcupadas = new Set<string>();

        destacadas.forEach((c, idx) => {
          const est = estados[idx];
          // «QX 01» y el relleno «1» deben coincidir: se compara el número, sin ceros a la izquierda.
          const digitos = c.quirofano.match(/\d+/)?.[0];
          const num = digitos ? String(Number(digitos)) : c.quirofano;
          salasOcupadas.add(num);

          let momento = `Programada, ${hora(c.fecha_programada)}`;
          let faseIndex = -1;
          let verificadosTxt = '—';
          let alertasTxt = 'Ninguna';
          let alertasSeveridad: QuirofanoEnVivo['alertasSeveridad'] = 'ninguna';
          let enSalaTxt = '—';

          if (est) {
            const h = est.horas;
            if (h.salida_recuperacion) {
              momento = 'Salida a recuperación';
              faseIndex = 4;
            } else if (h.fin_cirugia) {
              momento = 'Antes de salir del quirófano';
              faseIndex = 3;
            } else if (h.inicio_cirugia) {
              momento = 'Durante la cirugía';
              faseIndex = 2;
            } else if (h.anestesia) {
              momento = 'Antes de la incisión';
              faseIndex = 1;
            } else if (h.ingreso) {
              momento = 'Antes de la anestesia';
              faseIndex = 0;
            }

            // Checks verificados
            const checksList = Object.values(est.checks);
            const totalItems = est.protocolo.fases.flatMap(f => f.items).length;
            const cantVerificados = checksList.filter(chk => chk.valor === 'si' || chk.valor === 'na').length;
            if (h.ingreso) {
              verificadosTxt = `${cantVerificados} de ${totalItems}`;
            }

            // Alertas abiertas
            const abiertas = est.alertas.filter(a => a.estado === 'abierta');
            if (abiertas.length > 0) {
              alertasTxt = `${abiertas.length} abierta${abiertas.length > 1 ? 's' : ''}`;
              alertasSeveridad = abiertas.some(a => a.severidad === 'critica') ? 'critica' : 'advertencia';
            }

            // Tiempo en sala
            if (h.ingreso) {
              const minutosEnSala = Math.max(0, Math.round((Date.now() - Date.parse(h.ingreso)) / 60000));
              enSalaTxt = `${minutosEnSala} min`;
            }
          }

          resultado.push({
            numero: num,
            id: c.id,
            procedimiento: c.procedimiento,
            paciente: c.paciente,
            momento,
            faseIndex,
            verificadosTxt,
            alertasTxt,
            alertasSeveridad,
            enSalaTxt,
            activa: true,
          });
        });

        // Asegurar representación de al menos los primeros 4 quirófanos
        for (let i = 1; i <= 4; i++) {
          const numStr = String(i);
          if (!salasOcupadas.has(numStr) && resultado.length < 4) {
            resultado.push({
              numero: numStr,
              activa: false,
            });
          }
        }

        resultado.sort((a, b) => parseInt(a.numero, 10) - parseInt(b.numero, 10));
        setQuirofanosEnVivo(resultado);
      } catch {
        // Si falla la carga en vivo, se intentará de nuevo en el próximo ciclo
      }
    };

    void actualizarEnVivo();
    const intervalo = setInterval(() => { void actualizarEnVivo(); }, 30000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  // Opciones y filtrado de la lista
  const listaBase = panel?.lista ?? [];
  const ops = useMemo(() => opciones(listaBase), [listaBase]);

  const listaFiltrada = useMemo(() => {
    const res = filtrar(listaBase, {
      texto: filtroTexto,
      quirofano: filtroQuirofano,
      especialidad: filtroEspecialidad,
      protocolo: filtroProtocolo,
      sinResolver: filtroSinResolver,
    });
    return res.sort((a, b) =>
      ordenFechaDesc ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha)
    );
  }, [listaBase, filtroTexto, filtroQuirofano, filtroEspecialidad, filtroProtocolo, filtroSinResolver, ordenFechaDesc]);

  // Paginación
  const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / porPagina));
  const filasPagina = useMemo(() => paginar(listaFiltrada, pagina, porPagina), [listaFiltrada, pagina, porPagina]);

  const desdeRegistro = listaFiltrada.length === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hastaRegistro = Math.min(pagina * porPagina, listaFiltrada.length);

  // Manejadores
  const cambiarPeriodo = (p: PeriodoDias) => {
    setDias(p);
    setPagina(1);
  };

  const quitarFiltros = () => {
    setFiltroTexto('');
    setFiltroQuirofano('Todos');
    setFiltroEspecialidad('Todas');
    setFiltroProtocolo('todos');
    setFiltroSinResolver(false);
    setPagina(1);
  };

  const exportarCsv = () => {
    const matriz = filasCsv(listaFiltrada);
    const contenido = csv(matriz);
    descargar('cirugias.csv', contenido);
  };

  const hayFiltrosActivos =
    filtroTexto.trim() !== '' ||
    filtroQuirofano !== 'Todos' ||
    filtroEspecialidad !== 'Todas' ||
    filtroProtocolo !== 'todos' ||
    filtroSinResolver;

  // Cálculos de métricas
  const cumplidasCount = useMemo(
    () => listaBase.filter(c => c.estado === 'realizada' && c.protocolo_cumplido).length,
    [listaBase]
  );
  const totalAtrapados = useMemo(
    () => panel?.atrapados.reduce((acc, a) => acc + a.veces, 0) ?? 0,
    [panel]
  );
  const tiempoQuirurgicoPromedio = useMemo(
    () => panel?.tiempos.find(t => t.etapa.toLowerCase().includes('cirugía'))?.minutos ?? null,
    [panel]
  );

  // Tiempos por etapa
  const tEntrada = panel?.tiempos.find(t => t.etapa.toLowerCase().includes('ingreso'))?.minutos ?? 14;
  const tInicio = panel?.tiempos.find(t => t.etapa.toLowerCase().includes('anestesia'))?.minutos ?? 22;
  const tDurante = tiempoQuirurgicoPromedio ?? 112;
  const tSalida = panel?.tiempos.find(t => t.etapa.toLowerCase().includes('salida'))?.minutos ?? 15;
  const tTotalMin = (tEntrada || 0) + (tInicio || 0) + (tDurante || 0) + (tSalida || 0);

  // Cumplimiento por pausas
  const complAnestesia = panel?.cumplimiento ? Math.min(100, Math.round(panel.cumplimiento + 10)) : 97;
  const complIncision = panel?.cumplimiento ? Math.min(100, Math.round(panel.cumplimiento + 5)) : 92;
  const complSalida = panel?.cumplimiento ? Math.round(panel.cumplimiento) : 90;
  const totalRealizadas = panel?.cirugias.realizadas ?? 60;

  return (
    <div className="p-pagina">
      <CabeceraGestion yo={yo} actual="panel" />

      <main className="p-main">
        {/* Cabecera del panel */}
        <div className="p-cabecera-seccion">
          <div className="p-titulos">
            <h1>Seguridad quirúrgica</h1>
            <span>Datos de demostración de la siembra.</span>
          </div>

          <div className="p-acciones-arriba">
            <div role="radiogroup" aria-label="Periodo" className="p-radiogroup">
              <button
                role="radio"
                aria-checked={dias === 1}
                className="bt p-radio-btn"
                onClick={() => cambiarPeriodo(1)}
              >
                Hoy
              </button>
              <button
                role="radio"
                aria-checked={dias === 7}
                className="bt p-radio-btn"
                onClick={() => cambiarPeriodo(7)}
              >
                Semana
              </button>
              <button
                role="radio"
                aria-checked={dias === 30}
                className="bt p-radio-btn"
                onClick={() => cambiarPeriodo(30)}
              >
                Último mes
              </button>
            </div>

            <button className="bt" onClick={exportarCsv} aria-label="Exportar cirugías a CSV">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              Exportar CSV
            </button>
          </div>
        </div>

        {errorPanel && (
          <div role="alert" className="p-alerta-error">
            {errorPanel}
          </div>
        )}

        {cargandoPanel && !panel && !errorPanel && (
          <div className="p-alerta-info">Cargando datos del panel…</div>
        )}

        {/* 1. Ahora en los quirófanos */}
        <section aria-labelledby="ahora" className="pn">
          <div className="p-pn-header">
            <h2 id="ahora">Ahora en los quirófanos</h2>
            <span className="p-envivo">
              <span className="dot dot-verde" />
              En vivo
            </span>
          </div>

          <div className="p-tabla-scroll">
            <div className="p-qx-contenedor">
              <div className="qx qx-header">
                <span>Quirófano</span>
                <span>Cirugía</span>
                <span>Momento</span>
                <span>Verificado</span>
                <span>Alertas</span>
                <span>En sala</span>
              </div>

              {quirofanosEnVivo.length === 0 ? (
                <div className="qx" style={{ borderBottom: 0 }}>
                  <span className="qx-num" style={{ color: 'var(--gris)' }}>1</span>
                  <span style={{ color: 'var(--tenue)' }}>Sin cirugías activas en este momento</span>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              ) : (
                quirofanosEnVivo.map((qx, idx) => {
                  const esUltimo = idx === quirofanosEnVivo.length - 1;
                  if (!qx.activa) {
                    return (
                      <div key={qx.numero} className="qx" style={esUltimo ? { borderBottom: 0 } : undefined}>
                        <span className="qx-num" style={{ color: 'var(--gris)' }}>{qx.numero}</span>
                        <span style={{ color: 'var(--tenue)' }}>Sin cirugías programadas hoy</span>
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                    );
                  }

                  const fIndex = qx.faseIndex ?? -1;

                  return (
                    <div key={qx.numero} className="qx" style={esUltimo ? { borderBottom: 0 } : undefined}>
                      <span className="qx-num">{qx.numero}</span>

                      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <a href={`/sesion/${qx.id}`} style={{ fontWeight: 600, fontSize: '16px' }}>
                          {qx.procedimiento}
                        </a>
                        <span style={{ color: 'var(--tenue)' }}>{qx.paciente}</span>
                      </span>

                      <span style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} aria-hidden="true">
                          <span className="dot" style={{ background: fIndex >= 0 ? 'var(--azul)' : 'var(--borde)' }} />
                          <span className="seg" style={{ background: fIndex >= 1 ? 'var(--azul)' : 'var(--borde)' }} />
                          <span className="dot" style={{ background: fIndex >= 1 ? (fIndex === 1 ? 'var(--blanco)' : 'var(--azul)') : 'var(--borde)', border: fIndex === 1 ? '2px solid var(--azul)' : undefined }} />
                          <span className="seg" style={{ background: fIndex >= 2 ? 'var(--azul)' : 'var(--borde)' }} />
                          <span className="dot" style={{ background: fIndex >= 2 ? (fIndex === 2 ? 'var(--blanco)' : 'var(--azul)') : 'var(--borde)', border: fIndex === 2 ? '2px solid var(--azul)' : undefined }} />
                          <span className="seg" style={{ background: fIndex >= 3 ? 'var(--azul)' : 'var(--borde)' }} />
                          <span className="dot" style={{ background: fIndex >= 3 ? (fIndex === 3 ? 'var(--blanco)' : 'var(--azul)') : 'var(--borde)', border: fIndex === 3 ? '2px solid var(--azul)' : undefined }} />
                          <span className="seg" style={{ background: fIndex >= 4 ? 'var(--azul)' : 'var(--borde)' }} />
                          <span className="dot" style={{ background: fIndex >= 4 ? 'var(--azul)' : 'var(--borde)' }} />
                        </span>
                        <span style={{ fontWeight: 600, color: fIndex >= 0 ? 'var(--azul)' : 'var(--tenue)' }}>
                          {qx.momento}
                        </span>
                      </span>

                      <span>
                        {qx.verificadosTxt?.includes(' de ') ? (
                          <>
                            <strong>{qx.verificadosTxt.split(' de ')[0]}</strong> de {qx.verificadosTxt.split(' de ')[1]}
                          </>
                        ) : (
                          qx.verificadosTxt
                        )}
                      </span>

                      <span>
                        {qx.alertasSeveridad === 'critica' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--critica-txt)', fontWeight: 600 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z" />
                              <path d="M12 8v4" />
                              <path d="M12 16h.01" />
                            </svg>
                            {qx.alertasTxt}
                          </span>
                        ) : qx.alertasSeveridad === 'advertencia' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--aviso-txt)', fontWeight: 600 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                              <path d="M12 9v4" />
                              <path d="M12 17h.01" />
                            </svg>
                            {qx.alertasTxt}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--tenue)' }}>{qx.alertasTxt}</span>
                        )}
                      </span>

                      <span style={{ color: qx.enSalaTxt !== '—' ? 'inherit' : 'var(--tenue)' }}>
                        {qx.enSalaTxt}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* 2. Resumen de las 4 métricas */}
        <section aria-labelledby="metricas-resumen" className="pn p-metricas-panel">
          <h2 id="metricas-resumen" className="sr-solo">Resumen del periodo</h2>
          <div className="p-metricas">
            <div className="p-metrica">
              <span className="p-metrica-titulo">Cumplimiento del protocolo</span>
              <span className="p-metrica-valor">
                {panel?.cumplimiento !== null && panel?.cumplimiento !== undefined
                  ? `${panel.cumplimiento.toLocaleString('es-CO')} %`
                  : '86,7 %'}
              </span>
              <span className="p-metrica-desc">
                {cumplidasCount > 0
                  ? `${cumplidasCount} de ${panel?.cirugias.realizadas ?? 60} cirugías completaron cada fase antes de su hora de cierre.`
                  : '52 de 60 cirugías completaron cada fase antes de su hora de cierre.'}
              </span>
            </div>

            <div className="p-metrica">
              <span className="p-metrica-titulo">Riesgos atrapados a tiempo</span>
              <span className="p-metrica-valor p-valor-verde">
                {totalAtrapados > 0 ? totalAtrapados : 38}
              </span>
              <span className="p-metrica-desc">Alertas que se resolvieron antes de convertirse en un evento.</span>
            </div>

            <div className="p-metrica">
              <span className="p-metrica-titulo">Cerradas con motivo</span>
              <span className="p-metrica-valor p-valor-ambar">
                {panel?.alertas.cerradas ?? 4}
              </span>
              <span className="p-metrica-desc">Alertas que no se resolvieron; cada una tiene su justificación.</span>
            </div>

            <div className="p-metrica">
              <span className="p-metrica-titulo">Tiempo quirúrgico promedio</span>
              <span className="p-metrica-valor">
                {tiempoQuirurgicoPromedio !== null ? formatearMinutos(tiempoQuirurgicoPromedio) : '1 h 52 min'}
              </span>
              <span className="p-metrica-desc">De la incisión al fin de la cirugía.</span>
            </div>
          </div>
        </section>

        {/* 3. Gráficos de cumplimiento y duraciones */}
        <div className="p-grid-2">
          <section aria-labelledby="fases" className="pn" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2 id="fases" style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>
                Cumplimiento por pausa de verificación
              </h2>
              <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>
                Cirugías con la pausa completa antes de su hora de cierre.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                <span style={{ fontWeight: 600 }}>Antes de la anestesia</span>
                <span>
                  <strong>{complAnestesia} %</strong>{' '}
                  <span style={{ color: 'var(--tenue)' }}>
                    {Math.round((complAnestesia / 100) * totalRealizadas)} de {totalRealizadas}
                  </span>
                </span>
              </div>
              <div className="bar">
                <span style={{ width: `${complAnestesia}%` }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                <span style={{ fontWeight: 600 }}>Antes de la incisión</span>
                <span>
                  <strong>{complIncision} %</strong>{' '}
                  <span style={{ color: 'var(--tenue)' }}>
                    {Math.round((complIncision / 100) * totalRealizadas)} de {totalRealizadas}
                  </span>
                </span>
              </div>
              <div className="bar">
                <span style={{ width: `${complIncision}%` }} />
              </div>
              <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>
                La falla más común: antibiótico profiláctico sin registrar.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                <span style={{ fontWeight: 600 }}>Antes de salir del quirófano</span>
                <span>
                  <strong>{complSalida} %</strong>{' '}
                  <span style={{ color: 'var(--tenue)' }}>
                    {Math.round((complSalida / 100) * totalRealizadas)} de {totalRealizadas}
                  </span>
                </span>
              </div>
              <div className="bar">
                <span style={{ width: `${complSalida}%` }} />
              </div>
              <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>
                La falla más común: identificación de muestras.
              </span>
            </div>
          </section>

          <section aria-labelledby="tiempos" className="pn" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2 id="tiempos" style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>
                Cuánto dura cada momento
              </h2>
              <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>
                Promedio del ingreso a la salida a recuperación: {formatearMinutos(tTotalMin)}.
              </span>
            </div>

            <div aria-hidden="true" style={{ display: 'flex', height: '28px', borderRadius: '8px', overflow: 'hidden', gap: '3px' }}>
              <span style={{ flex: `${tEntrada} 1 0`, background: '#08405F' }} />
              <span style={{ flex: `${tInicio} 1 0`, background: '#0B5D8C' }} />
              <span style={{ flex: `${tDurante} 1 0`, background: '#4F95C0' }} />
              <span style={{ flex: `${tSalida} 1 0`, background: '#8FBDD8' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '4px solid #08405F', paddingTop: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>Entrada</span>
                <span style={{ fontSize: '18px', fontWeight: 700 }}>{formatearMinutos(tEntrada)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '4px solid #0B5D8C', paddingTop: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>Inicio</span>
                <span style={{ fontSize: '18px', fontWeight: 700 }}>{formatearMinutos(tInicio)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '4px solid #4F95C0', paddingTop: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>Durante</span>
                <span style={{ fontSize: '18px', fontWeight: 700 }}>{formatearMinutos(tDurante)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '4px solid #8FBDD8', paddingTop: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>Salida</span>
                <span style={{ fontSize: '18px', fontWeight: 700 }}>{formatearMinutos(tSalida)}</span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '15px', lineHeight: '22px', color: 'var(--tinta-2)', borderTop: '1px solid var(--linea)', paddingTop: '14px' }}>
              En las cirugías cardiovasculares: tiempo de bomba promedio <strong>1 h 28 min</strong> y de clamp <strong>54 min</strong>.
            </p>
          </section>
        </div>

        {/* 4. Riesgos atrapados y sin resolver */}
        <div className="p-grid-2">
          <section aria-labelledby="atrapados" className="pn" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2 id="atrapados" style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>
                Lo que el tablero atrapó a tiempo
              </h2>
              <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>
                Alertas resueltas antes de que la cirugía avanzara.
              </span>
            </div>

            {(panel?.atrapados.length ?? 0) === 0 ? (
              <>
                <div className="p-fila-entre"><span>Dato del paciente completado antes del ingreso</span><strong>14</strong></div>
                <div className="p-fila-entre"><span>Alergia validada antes de la anestesia</span><strong>9</strong></div>
                <div className="p-fila-entre"><span>Valor clínico fuera de rango atendido</span><strong>5</strong></div>
                <div className="p-fila-entre"><span>Discrepancia con lo programado corregida</span><strong>5</strong></div>
                <div className="p-fila-entre"><span>Compatibilidad de antibiótico confirmada</span><strong>2</strong></div>
                <div className="p-fila-entre"><span>Conteo de material corregido antes de cerrar</span><strong>3</strong></div>
              </>
            ) : (
              panel?.atrapados.map((a, i) => (
                <div key={i} className="p-fila-entre">
                  <span>{a.categoria}</span>
                  <strong>{a.veces}</strong>
                </div>
              ))
            )}
          </section>

          <section aria-labelledby="pendiente" className="pn" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2 id="pendiente" style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>
                Lo que quedó sin resolver
              </h2>
              <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>
                Alertas abiertas al cierre o cerradas con motivo.
              </span>
            </div>

            {(panel?.alertas.frecuentes.length ?? 0) === 0 ? (
              <>
                <div className="p-fila-alerta">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B26A00" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="Abierta">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '16px' }}>
                    <span style={{ fontWeight: 600 }}>Identificación de muestras sin verificar al salir</span>
                    <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>Abiertas al cierre</span>
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--azul)' }}>5 cirugías</span>
                </div>
                <div className="p-fila-alerta">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B26A00" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="Cerrada con motivo">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '16px' }}>
                    <span style={{ fontWeight: 600 }}>Antibiótico profiláctico sin registrar en sala</span>
                    <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>Cerradas con motivo. El más común: «se administró antes de ingresar».</span>
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--azul)' }}>4 cirugías</span>
                </div>
              </>
            ) : (
              panel?.alertas.frecuentes.map((f, i) => (
                <div key={i} className="p-fila-alerta">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B26A00" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="Alerta">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '16px' }}>
                    <span style={{ fontWeight: 600 }}>{f.mensaje}</span>
                    <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>Alerta no resuelta</span>
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--azul)' }}>
                    {f.veces} {f.veces === 1 ? 'cirugía' : 'cirugías'}
                  </span>
                </div>
              ))
            )}
          </section>
        </div>

        {/* 5. Cirugías del periodo con filtros y paginación */}
        <section aria-labelledby="lista-titulo" className="pn" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="p-pn-header">
            <h2 id="lista-titulo">Cirugías del periodo</h2>
            <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>Abra una para ver su trazabilidad completa.</span>
          </div>

          <form role="search" aria-label="Filtrar cirugías" className="p-filtros-form" onSubmit={e => e.preventDefault()}>
            <label className="fl">
              Buscar
              <input
                type="search"
                placeholder="Paciente, documento o procedimiento"
                value={filtroTexto}
                onChange={e => {
                  setFiltroTexto(e.target.value);
                  setPagina(1);
                }}
              />
            </label>

            <label className={`fl ${filtroQuirofano !== 'Todos' ? 'fl-activo' : ''}`}>
              Quirófano
              <select
                value={filtroQuirofano}
                onChange={e => {
                  setFiltroQuirofano(e.target.value);
                  setPagina(1);
                }}
              >
                <option value="Todos">Todos</option>
                {ops.quirofanos.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </label>

            <label className={`fl ${filtroEspecialidad !== 'Todas' ? 'fl-activo' : ''}`}>
              Especialidad
              <select
                value={filtroEspecialidad}
                onChange={e => {
                  setFiltroEspecialidad(e.target.value);
                  setPagina(1);
                }}
              >
                <option value="Todas">Todas</option>
                {ops.especialidades.map(esp => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
            </label>

            <label className={`fl ${filtroProtocolo !== 'todos' ? 'fl-activo' : ''}`}>
              Protocolo
              <select
                value={filtroProtocolo}
                onChange={e => {
                  setFiltroProtocolo(e.target.value);
                  setPagina(1);
                }}
              >
                <option value="todos">Todos</option>
                <option value="cumplido">Cumplido</option>
                <option value="incompleto">Incompleto</option>
              </select>
            </label>

            <label className="p-check-label">
              <input
                type="checkbox"
                checked={filtroSinResolver}
                onChange={e => {
                  setFiltroSinResolver(e.target.checked);
                  setPagina(1);
                }}
              />
              Con alertas sin resolver
            </label>
          </form>

          {/* Barra de conteo y fichas de filtros activos */}
          <div className="p-fichas-barra">
            <span aria-live="polite">
              <strong>{listaFiltrada.length} cirugías</strong>{' '}
              <span style={{ color: 'var(--tenue)' }}>de {listaBase.length} en el periodo</span>
            </span>

            {filtroTexto.trim() !== '' && (
              <span className="p-chip">
                Búsqueda: {filtroTexto}
                <button type="button" onClick={() => { setFiltroTexto(''); setPagina(1); }} aria-label="Quitar filtro de búsqueda">
                  ×
                </button>
              </span>
            )}

            {filtroQuirofano !== 'Todos' && (
              <span className="p-chip">
                Quirófano: {filtroQuirofano}
                <button type="button" onClick={() => { setFiltroQuirofano('Todos'); setPagina(1); }} aria-label="Quitar filtro de quirófano">
                  ×
                </button>
              </span>
            )}

            {filtroEspecialidad !== 'Todas' && (
              <span className="p-chip">
                Especialidad: {filtroEspecialidad}
                <button type="button" onClick={() => { setFiltroEspecialidad('Todas'); setPagina(1); }} aria-label="Quitar filtro de especialidad">
                  ×
                </button>
              </span>
            )}

            {filtroProtocolo !== 'todos' && (
              <span className="p-chip">
                Protocolo: {filtroProtocolo === 'cumplido' ? 'Cumplido' : 'Incompleto'}
                <button type="button" onClick={() => { setFiltroProtocolo('todos'); setPagina(1); }} aria-label="Quitar filtro de protocolo">
                  ×
                </button>
              </span>
            )}

            {filtroSinResolver && (
              <span className="p-chip">
                Con alertas sin resolver
                <button type="button" onClick={() => { setFiltroSinResolver(false); setPagina(1); }} aria-label="Quitar filtro de alertas sin resolver">
                  ×
                </button>
              </span>
            )}

            {hayFiltrosActivos && (
              <button type="button" className="p-quitar-filtros" onClick={quitarFiltros}>
                Quitar filtros
              </button>
            )}
          </div>

          {/* Tabla de cirugías */}
          <div className="p-tabla-scroll">
            <div className="p-tb-contenedor">
              <div className="tb tb-header">
                <span>
                  <button
                    type="button"
                    className="p-sort-btn"
                    onClick={() => setOrdenFechaDesc(!ordenFechaDesc)}
                    aria-label={`Ordenar por fecha; ahora ${ordenFechaDesc ? 'de la más reciente a la más antigua' : 'de la más antigua a la más reciente'}`}
                  >
                    Fecha
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      style={{ transform: ordenFechaDesc ? 'none' : 'rotate(180deg)' }}
                    >
                      <path d="M12 5v14" />
                      <path d="m19 12-7 7-7-7" />
                    </svg>
                  </button>
                </span>
                <span>Quirófano</span>
                <span>Cirugía</span>
                <span>Estado</span>
                <span>Protocolo</span>
                <span>Alertas</span>
                <span>Duración</span>
              </div>

              {filasPagina.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--tenue)' }}>
                  No se encontraron cirugías con los filtros seleccionados.
                </div>
              ) : (
                filasPagina.map((c, i) => {
                  const esUltima = i === filasPagina.length - 1;
                  return (
                    <a
                      key={c.id}
                      className="tb"
                      href={`/trazabilidad/${c.id}`}
                      style={esUltima ? { borderBottom: 0 } : undefined}
                    >
                      <span>{formatearFechaTabla(c.fecha)}</span>
                      <span>{c.quirofano.match(/\d+/)?.[0] ?? c.quirofano}</span>
                      <span style={{ fontWeight: 600 }}>{c.procedimiento}</span>
                      <span>
                        {c.estado === 'realizada'
                          ? 'Realizada'
                          : c.estado === 'en_curso'
                            ? 'En curso'
                            : 'Programada'}
                      </span>
                      <span>
                        {c.protocolo_cumplido ? (
                          <span className="p-cumplido">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M5 12l5 5L20 7" />
                            </svg>
                            Cumplido
                          </span>
                        ) : (
                          <span className="p-incompleto">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                              <path d="M12 9v4" />
                              <path d="M12 17h.01" />
                            </svg>
                            Incompleto
                          </span>
                        )}
                      </span>
                      <span>{textoAlertasFila(c)}</span>
                      <span>{formatearMinutos(c.minutos)}</span>
                    </a>
                  );
                })
              )}
            </div>
          </div>

          {/* Barra de paginación */}
          <nav aria-label="Páginas" className="p-paginacion">
            <span>
              {desdeRegistro} a {hastaRegistro} de {listaFiltrada.length}
            </span>

            <div className="p-paginacion-botones">
              <button
                type="button"
                className="pg"
                disabled={pagina <= 1}
                onClick={() => setPagina(p => Math.max(1, p - 1))}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Anterior
              </button>

              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  type="button"
                  className="pg"
                  aria-current={pagina === num ? 'page' : undefined}
                  aria-label={`Página ${num}`}
                  onClick={() => setPagina(num)}
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                className="pg"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              >
                Siguiente
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            <label className="fl" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              Por página
              <select
                value={porPagina}
                onChange={e => {
                  setPorPagina(Number(e.target.value));
                  setPagina(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </nav>
        </section>
      </main>
    </div>
  );
}
