import { useState, useEffect } from 'react';
import type { PropsBloque } from './props.ts';
import type { Rol } from '../../api/src/tipos.ts';
import { ROLES, hora } from './etiquetas.ts';
import { Consumo } from './Consumo.tsx';
import './bloques.css';

export function Lateral({ estado, modo, registrar }: PropsBloque) {
  const esTablet = modo === 'tablet';

  const [mostrarConsumo, setMostrarConsumo] = useState(false);
  const [dialogoMaterial, setDialogoMaterial] = useState(false);
  const [materialSeleccionado, setMaterialSeleccionado] = useState(estado.protocolo.materiales[0] ?? 'Compresas');
  const [cantidadEntrada, setCantidadEntrada] = useState(10);

  // En tablet, mientras se ve el protocolo de conteo, Lateral puede devolver null
  const hayAlertaConteo = estado.alertas.some(a => a.estado === 'abierta' && a.id.startsWith('conteo:'));
  if (esTablet && hayAlertaConteo && !mostrarConsumo) {
    return null;
  }

  // Manejo de tecla Escape para el modal de entrada de material
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && dialogoMaterial) {
        setDialogoMaterial(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialogoMaterial]);

  function confirmarEntradaMaterial() {
    if (!materialSeleccionado || cantidadEntrada <= 0) return;
    registrar({ tipo: 'conteo', material: materialSeleccionado, cantidad: Number(cantidadEntrada) });
    setDialogoMaterial(false);
  }

  // Determinar el momento:
  // 1. Antes de la anestesia: Equipo en sala
  // 2. Antes de la incisión y durante la cirugía: Material en campo
  // 3. Antes de salir o posterior: Hasta ahora
  const esAntesAnestesia = !estado.horas.anestesia;
  const esSalida = Boolean(estado.horas.fin_cirugia || estado.fase_actual === 'antes_salida' || estado.horas.salida_recuperacion);
  const esMaterialEnCampo = !esAntesAnestesia && !esSalida;

  const programados = Object.entries(estado.cirugia.equipo_programado) as [Rol, { id: string; nombre: string }][];
  const presentesCount = programados.filter(([, p]) => p && estado.presentes.includes(p.id)).length;

  const materiales = estado.protocolo.materiales;
  const materialesConMov = materiales.filter(m => {
    const c = estado.conteo[m];
    return c && (c.entra > 0 || c.sale > 0);
  });

  const resueltas = estado.alertas.filter(a => a.estado === 'resuelta').length;
  const cerradas = estado.alertas.filter(a => a.estado === 'cerrada').length;

  return (
    <>
      <section
        className="bloque-atencion"
        style={{ flexGrow: 1 }}
        aria-labelledby="lateral-titulo"
      >
        {/* Caso 1: Antes de la anestesia -> Equipo en sala */}
        {esAntesAnestesia && (
          <>
            <div className="atencion-cabecera">
              <h2 id="lateral-titulo" className="atencion-titulo">Equipo en sala</h2>
              <span style={{ fontSize: esTablet ? '15px' : '22px', color: 'var(--tenue)' }}>
                <strong>{presentesCount}</strong> de {programados.length}
              </span>
            </div>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {programados.map(([rol, persona]) => {
                if (!persona) return null;
                const estaPresente = estado.presentes.includes(persona.id);

                return (
                  <li
                    key={persona.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: '44px',
                      fontSize: esTablet ? '16px' : '21px',
                      borderBottom: '1px solid var(--linea)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {estaPresente ? (
                        <svg width={esTablet ? '18' : '22'} height={esTablet ? '18' : '22'} viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-label="Presente">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      ) : (
                        <span
                          style={{
                            width: esTablet ? '18' : '22',
                            height: esTablet ? '18' : '22',
                            borderRadius: '999px',
                            border: '2px dashed var(--aviso)',
                            display: 'block',
                          }}
                        />
                      )}
                      <span>
                        {persona.nombre}{' '}
                        <span style={{ color: 'var(--tenue)', fontSize: esTablet ? '14px' : '18px' }}>
                          {ROLES[rol]?.toLowerCase()}
                        </span>
                      </span>
                    </div>

                    {esTablet && !estaPresente && (
                      <button
                        className="btn"
                        style={{ minHeight: '36px', padding: '0 10px', fontSize: '13px' }}
                        onClick={() => registrar({ tipo: 'presente', usuario_id: persona.id, rol })}
                      >
                        Marcar presente
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* Caso 2: Antes de la incisión y durante -> Material en campo */}
        {esMaterialEnCampo && (
          <>
            <div className="atencion-cabecera">
              <h2 id="lateral-titulo" className="atencion-titulo">Material en campo</h2>
            </div>

            {materialesConMov.length === 0 ? (
              <p style={{ margin: 0, fontSize: esTablet ? '15px' : '22px', lineHeight: 1.5, color: 'var(--tenue)' }}>
                {esTablet
                  ? 'Todavía no entra material. Dígalo en voz alta o regístrelo aquí.'
                  : 'Todavía no entra material. El conteo empieza con la primera entrada, por ejemplo «entran diez compresas».'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 50px 50px 70px', gap: '8px', borderBottom: '1px solid var(--linea)', paddingBottom: '4px', fontSize: esTablet ? '13px' : '19px', color: 'var(--tenue)' }}>
                  <span>Material</span>
                  <span style={{ textAlign: 'right' }}>Entra</span>
                  <span style={{ textAlign: 'right' }}>Sale</span>
                  <span style={{ textAlign: 'right' }}>En campo</span>
                </div>
                {materialesConMov.map(m => {
                  const c = estado.conteo[m] ?? { entra: 0, sale: 0 };
                  const enCampo = c.entra - c.sale;
                  return (
                    <div
                      key={m}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) 50px 50px 70px',
                        gap: '8px',
                        alignItems: 'center',
                        minHeight: '38px',
                        borderBottom: '1px solid var(--linea)',
                        fontSize: esTablet ? '15px' : '21px',
                      }}
                    >
                      <span>{m}</span>
                      <span style={{ textAlign: 'right' }}>{c.entra}</span>
                      <span style={{ textAlign: 'right' }}>{c.sale}</span>
                      <span style={{ textAlign: 'right', fontWeight: 700 }}>{enCampo}</span>
                    </div>
                  );
                })}
                {!esTablet && (
                  <span style={{ fontSize: '18px', color: 'var(--tenue)', paddingTop: '8px' }}>
                    Otros {materiales.length - materialesConMov.length} materiales sin movimiento.
                  </span>
                )}
              </div>
            )}

            {esTablet && (
              <button
                className="btn"
                style={{ alignSelf: 'flex-start', marginTop: '6px' }}
                onClick={() => setDialogoMaterial(true)}
              >
                Registrar entrada de material
              </button>
            )}
          </>
        )}

        {/* Caso 3: Antes de salir -> Hasta ahora */}
        {esSalida && (
          <>
            <div className="atencion-cabecera">
              <h2 id="lateral-titulo" className="atencion-titulo">Hasta ahora</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: esTablet ? '15px' : '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--linea)', padding: '6px 0' }}>
                <span>Ingreso</span>
                <strong>{hora(estado.horas.ingreso)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--linea)', padding: '6px 0' }}>
                <span>Anestesia</span>
                <strong>{hora(estado.horas.anestesia)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--linea)', padding: '6px 0' }}>
                <span>Inicio cirugía</span>
                <strong>{hora(estado.horas.inicio_cirugia)}</strong>
              </div>
              {estado.horas.fin_cirugia && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--linea)', padding: '6px 0' }}>
                  <span>Fin cirugía</span>
                  <strong>{hora(estado.horas.fin_cirugia)}</strong>
                </div>
              )}

              {estado.duraciones.map(d => (
                <div key={d.nombre} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--linea)', padding: '6px 0' }}>
                  <span>{d.nombre}</span>
                  <strong>{d.minutos !== null ? `${d.minutos} min` : '—'}</strong>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--linea)', padding: '6px 0' }}>
                <span>Alertas</span>
                <strong>{resueltas} resueltas, {cerradas} cerradas</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span>Insumos en la hoja</span>
                <strong>{estado.consumo.length}</strong>
              </div>
            </div>
          </>
        )}

        {/* En tablet, siempre visible el botón Consumo (N) */}
        {esTablet && (
          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <button
              className="btn btn-primario"
              style={{ width: '100%', minHeight: '44px' }}
              onClick={() => setMostrarConsumo(true)}
            >
              Consumo ({estado.consumo.length})
            </button>
          </div>
        )}
      </section>

      {/* Diálogo para registrar entrada de material en tablet */}
      {dialogoMaterial && (
        <div className="modal-overlay" onClick={() => setDialogoMaterial(false)}>
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-entrada-material"
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 id="titulo-entrada-material" style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 600, margin: 0 }}>
                Registrar entrada de material
              </h2>
              <button
                className="btn"
                aria-label="Cancelar"
                style={{ minHeight: '44px', width: '44px', padding: 0 }}
                onClick={() => setDialogoMaterial(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '15px', fontWeight: 600 }}>
              Material
              <select
                value={materialSeleccionado}
                onChange={e => setMaterialSeleccionado(e.target.value)}
                style={{
                  minHeight: '44px',
                  border: '1px solid var(--borde-fuerte)',
                  borderRadius: '10px',
                  padding: '0 12px',
                  fontSize: '16px',
                  background: 'var(--blanco)',
                }}
              >
                {estado.protocolo.materiales.map(mat => (
                  <option key={mat} value={mat}>
                    {mat}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '15px', fontWeight: 600 }}>
              Cantidad que entra
              <input
                type="number"
                min="1"
                value={cantidadEntrada}
                onChange={e => setCantidadEntrada(Number(e.target.value))}
                style={{
                  minHeight: '44px',
                  border: '1px solid var(--borde-fuerte)',
                  borderRadius: '10px',
                  padding: '0 12px',
                  fontSize: '16px',
                }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn" onClick={() => setDialogoMaterial(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primario"
                onClick={confirmarEntradaMaterial}
              >
                Registrar entrada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel lateral de Consumo */}
      {mostrarConsumo && (
        <Consumo
          estado={estado}
          registrar={registrar}
          onCerrar={() => setMostrarConsumo(false)}
        />
      )}
    </>
  );
}
