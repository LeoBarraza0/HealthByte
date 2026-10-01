import type { PropsBloque } from './props.ts';
import type { Fase, ItemChecklist } from '../../api/src/tipos.ts';
import { ROLES, hora } from './etiquetas.ts';
import { pendientes, verificados } from './bloques.ts';
import './bloques.css';

export function Ahora({ estado, modo, registrar }: PropsBloque) {
  const esTablet = modo === 'tablet';

  // Determinación de la fase actual o momento
  const esSalidaFinalizada = Boolean(estado.horas.salida_recuperacion);
  const esDurante = estado.fase_actual === 'durante' || (!estado.fase_actual && Boolean(estado.horas.inicio_cirugia && !estado.horas.fin_cirugia));

  let faseActiva: Fase | undefined;
  if (!esDurante && !esSalidaFinalizada) {
    if (estado.fase_actual) {
      faseActiva = estado.protocolo.fases.find(f => f.id === estado.fase_actual);
    } else if (!estado.horas.ingreso) {
      // Antes del ingreso se muestra la primera fase
      faseActiva = estado.protocolo.fases[0];
    }
  }

  // 1. Resumen final si ya hubo salida a recuperación
  if (esSalidaFinalizada) {
    const totalItems = estado.protocolo.fases.flatMap(f => f.items).length;
    const totalVerificados = Object.values(estado.checks).filter(c => c.valor === 'si' || c.valor === 'na').length;
    return (
      <section className="bloque-ahora" aria-labelledby="ahora-titulo">
        <div className="ahora-cabecera">
          <h2 id="ahora-titulo" className="ahora-titulo">Cirugía finalizada</h2>
          <span className="ahora-conteo-verif">
            <strong>{totalVerificados}</strong> de {totalItems} verificados
          </span>
        </div>
        <p style={{ margin: '8px 0', fontSize: esTablet ? '16px' : '22px', color: 'var(--tenue)' }}>
          Paciente en recuperación. Todos los eventos y verificaciones quedaron registrados de manera inmutable.
        </p>
        {estado.duraciones.length > 0 && (
          <div className="duraciones-cards">
            {estado.duraciones.map(d => (
              <div key={d.nombre} className="duracion-card">
                <span className="duracion-card-titulo">{d.nombre}</span>
                <span className="duracion-card-valor">
                  {d.minutos !== null ? `${Math.floor(d.minutos / 60)}h ${d.minutos % 60}m` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  // 2. Durante la cirugía
  if (esDurante) {
    const hitos = estado.protocolo.hitos;
    const mediciones = estado.protocolo.mediciones;
    const novedades = estado.novedades;

    return (
      <section className="bloque-ahora" aria-labelledby="ahora-titulo">
        <div className="ahora-cabecera">
          <h2 id="ahora-titulo" className="ahora-titulo">Durante la cirugía</h2>
          <span className="ahora-conteo-verif">Diga el evento y el tablero toma la hora</span>
        </div>

        <div className="grid-durante">
          {/* Columna 1: Duraciones e hitos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {estado.duraciones.length > 0 && (
              <div className="duraciones-cards">
                {estado.duraciones.map(d => (
                  <div key={d.nombre} className="duracion-card">
                    <span className="duracion-card-titulo">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="13" r="8" />
                        <path d="M12 9v4l2 2" />
                        <path d="M9 2h6" />
                      </svg>
                      {d.nombre}
                    </span>
                    <span className="duracion-card-valor">
                      {d.minutos !== null ? `${d.minutos} min` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 className="subtitulo-seccion">Hitos de la especialidad</h3>
              {hitos.map(hito => {
                const ev = estado.eventos.find(e => e.datos.tipo === 'hito' && e.datos.hito === hito);
                return (
                  <div key={hito} className={`fila-hito ${ev ? 'reciente' : ''}`}>
                    <span style={{ fontWeight: 600 }}>{ev ? hora(ev.ts) : '—'}</span>
                    <span>{hito}</span>
                    <div>
                      {ev ? (
                        <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>{ev.origen === 'voz' ? 'Por voz' : ev.origen === 'camara' ? 'Por cámara' : 'Manual'}</span>
                      ) : esTablet ? (
                        <button
                          className="btn"
                          style={{ minHeight: '36px', padding: '0 10px', fontSize: '14px' }}
                          onClick={() => registrar({ tipo: 'hito', hito })}
                        >
                          Marcar
                        </button>
                      ) : (
                        <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>Pendiente</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Columna 2: Mediciones y novedades */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mediciones.map(m => {
              const ultimas = estado.eventos
                .filter(e => e.datos.tipo === 'medicion' && e.datos.medicion === m.id)
                .slice(-3);
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 className="subtitulo-seccion">{m.etiqueta}</h3>
                  {ultimas.length === 0 ? (
                    <span style={{ fontSize: '15px', color: 'var(--tenue)' }}>Sin mediciones registradas</span>
                  ) : (
                    ultimas.map((u, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--linea)', fontSize: esTablet ? '16px' : '22px' }}>
                        <span style={{ fontWeight: 600 }}>{hora(u.ts)}</span>
                        <span>{u.datos.tipo === 'medicion' ? u.datos.valor : ''} <small style={{ color: 'var(--tenue)' }}>{m.unidad}</small></span>
                      </div>
                    ))
                  )}
                </div>
              );
            })}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 className="subtitulo-seccion">Novedades</h3>
              {novedades.length === 0 ? (
                <span style={{ fontSize: '15px', color: 'var(--tenue)' }}>
                  Ninguna. Para reportar una, dígala: «se dañó el aspirador».
                </span>
              ) : (
                novedades.map(nov => (
                  <div key={nov.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--linea)', fontSize: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600 }}>{nov.texto}</span>
                      <span style={{ fontSize: '13px', color: 'var(--tenue)' }}>{hora(nov.ts)}</span>
                    </div>
                    <span style={{ fontSize: '13px', color: nov.estado === 'solucionada' ? 'var(--ok)' : 'var(--aviso)' }}>
                      Estado: {nov.estado}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 3. Fases con checklist: antes_anestesia, antes_incision o antes_salida
  const fase = faseActiva ?? estado.protocolo.fases[0];
  const itemsPendientes = pendientes(estado, fase.id);
  const itemsVerificados = verificados(estado, fase.id);
  const total = fase.items.length;
  const numVerif = itemsVerificados.length;
  const esSalida = fase.id === 'antes_salida';

  return (
    <section className="bloque-ahora" aria-labelledby="ahora-titulo">
      <div className="ahora-cabecera">
        <h2 id="ahora-titulo" className="ahora-titulo">{fase.nombre}</h2>
        <span className="ahora-conteo-verif">
          <strong>{numVerif}</strong> de {total} verificados
        </span>
      </div>

      {/* Barra segmentada */}
      <div
        className="barra-segmentada"
        aria-hidden="true"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`segmento ${i < numVerif ? 'activo' : ''}`} />
        ))}
      </div>

      {/* En la fase de Salida: tabla de conteo de material */}
      {esSalida && (
        <div className="tabla-material">
          <div className="fila-material cabecera">
            <span>Material</span>
            <span>Entró</span>
            <span>Salió</span>
            <span>Resultado</span>
            {esTablet && <span></span>}
          </div>
          {estado.protocolo.materiales.map(mat => {
            const c = estado.conteo[mat] ?? { entra: 0, sale: 0 };
            // Mostrar si tiene movimiento o si es un material principal
            const diff = c.entra - c.sale;
            const tieneMovimiento = c.entra > 0 || c.sale > 0;
            const noCuadra = tieneMovimiento && diff !== 0;

            return (
              <div key={mat} className={`fila-material ${noCuadra ? 'descuadre' : ''}`}>
                <span>{mat}</span>
                <span>{c.entra}</span>
                <span>{c.sale}</span>
                <span>
                  {tieneMovimiento ? (
                    diff === 0 ? (
                      <span className="material-cuadra">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                        Cuadra
                      </span>
                    ) : (
                      <span className="material-falta">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z" />
                          <path d="M12 8v4" />
                          <path d="M12 16h.01" />
                        </svg>
                        {diff > 0 ? `Falta ${diff}` : `Sobran ${-diff}`}
                      </span>
                    )
                  ) : (
                    <span style={{ color: 'var(--tenue)' }}>—</span>
                  )}
                </span>
                {esTablet && (
                  <span style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      className="btn"
                      style={{ minWidth: '44px', padding: 0 }}
                      aria-label={`Sale un ${mat}`}
                      onClick={() => registrar({ tipo: 'conteo', material: mat, cantidad: -1 })}
                    >
                      −1
                    </button>
                    <button
                      className="btn"
                      style={{ minWidth: '44px', padding: 0 }}
                      aria-label={`Entra un ${mat}`}
                      onClick={() => registrar({ tipo: 'conteo', material: mat, cantidad: 1 })}
                    >
                      +1
                    </button>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Falta verificar */}
      {itemsPendientes.length > 0 && (
        <>
          <h3 className="subtitulo-seccion">Falta verificar</h3>
          <div className={esSalida ? 'rejilla-salida-pendientes' : 'lista-pendientes'}>
            {itemsPendientes.map(item => (
              <div
                key={item.id}
                className={`item-pendiente-card ${item.critico ? 'critico' : ''} ${esSalida ? 'card-salida-pendiente' : ''}`}
              >
                <div className="pendiente-cabecera">
                  <div className="pendiente-info">
                    <span className="pendiente-texto">{item.texto}</span>
                    <span className="pendiente-subtexto">
                      Lo confirma {item.rol ? ROLES[item.rol]?.toLowerCase() : 'el equipo'}
                    </span>
                  </div>
                  {item.critico && (
                    <span className="badge-critico">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                      </svg>
                      Crítico
                    </span>
                  )}
                </div>

                {esTablet && (
                  <div className="botones-check" role="group" aria-label={item.texto}>
                    <button
                      className="btn ok"
                      onClick={() => registrar({ tipo: 'check', fase: fase.id, item: item.id, valor: 'si' })}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                      Verificado
                    </button>
                    <button
                      className="btn"
                      onClick={() => registrar({ tipo: 'check', fase: fase.id, item: item.id, valor: 'no' })}
                    >
                      No coincide
                    </button>
                    <button
                      className="btn"
                      onClick={() => registrar({ tipo: 'check', fase: fase.id, item: item.id, valor: 'na' })}
                    >
                      No aplica
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Verificado (compacto) */}
      {itemsVerificados.length > 0 && (
        <>
          <h3 className="subtitulo-seccion">Verificado</h3>
          <div className="lista-verificados">
            {itemsVerificados.map(item => {
              const ev = estado.eventos.findLast(
                e => e.datos.tipo === 'check' && e.datos.fase === fase.id && e.datos.item === item.id
              );
              const check = estado.checks[`${fase.id}.${item.id}`];
              const origen = ev?.origen ?? 'manual';
              const ts = ev?.ts ?? check?.ts;
              const rolConfirma = ev?.rol_confirma ?? check?.rol ?? item.rol;

              return (
                <div key={item.id} className="item-verificado-row">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                  <span>{item.texto}</span>
                  <span className="item-verificado-meta">
                    {origen === 'voz' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Por voz">
                        <rect x="9" y="3" width="6" height="11" rx="3" />
                        <path d="M5 11a7 7 0 0 0 14 0" />
                        <path d="M12 18v3" />
                      </svg>
                    ) : origen === 'camara' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Por cámara">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="A mano">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    )}
                    {rolConfirma ? ROLES[rolConfirma] : 'Equipo'}, {hora(ts)}
                    {esTablet && (origen === 'voz' ? ', por voz' : origen === 'camara' ? ', por cámara' : ', a mano')}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
