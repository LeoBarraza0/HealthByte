import { useState, useRef, useEffect } from 'react';
import type { PropsBloque } from './props.ts';
import type { Alerta } from '../../api/src/tipos.ts';
import { hora } from './etiquetas.ts';
import './bloques.css';

const MOTIVOS_CIERRE = [
  'Lo indicó la cirujana',
  'Se administró antes de ingresar a sala',
  'No aplica para este procedimiento',
  'Otro motivo',
];

export function Atencion({ estado, modo, registrar }: PropsBloque) {
  const esTablet = modo === 'tablet';

  const [alertaParaCerrar, setAlertaParaCerrar] = useState<Alerta | null>(null);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState(MOTIVOS_CIERRE[1]);
  const [detalleCierre, setDetalleCierre] = useState('');

  const [alertaParaDato, setAlertaParaDato] = useState<Alerta | null>(null);
  const [valorDato, setValorDato] = useState('');

  const botonIniciadorRef = useRef<HTMLElement | null>(null);

  // Manejo de tecla Escape para cerrar modales y devolver el foco
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (alertaParaCerrar) {
          cerrarModalCierre();
        } else if (alertaParaDato) {
          cerrarModalDato();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [alertaParaCerrar, alertaParaDato]);

  function abrirModalCierre(alerta: Alerta, e: React.MouseEvent<HTMLElement>) {
    botonIniciadorRef.current = e.currentTarget;
    setAlertaParaCerrar(alerta);
    setMotivoSeleccionado(MOTIVOS_CIERRE[1]);
    setDetalleCierre('');
  }

  function cerrarModalCierre() {
    setAlertaParaCerrar(null);
    botonIniciadorRef.current?.focus();
  }

  function confirmarCierreAlerta() {
    if (!alertaParaCerrar) return;
    const motivoFinal = detalleCierre.trim()
      ? `${motivoSeleccionado} — ${detalleCierre.trim()}`
      : motivoSeleccionado;
    registrar({ tipo: 'alerta_cierre', alerta: alertaParaCerrar.id, motivo: motivoFinal });
    cerrarModalCierre();
  }

  function abrirModalDato(alerta: Alerta, e: React.MouseEvent<HTMLElement>) {
    botonIniciadorRef.current = e.currentTarget;
    setAlertaParaDato(alerta);
    setValorDato('');
  }

  function cerrarModalDato() {
    setAlertaParaDato(null);
    botonIniciadorRef.current?.focus();
  }

  function confirmarRegistroDato() {
    if (!alertaParaDato) return;
    const campoId = alertaParaDato.id.replace('dato:', '');
    const campoDef = estado.protocolo.campos_preop.find(c => c.id === campoId);
    const esNumero = campoDef?.tipo === 'numero';
    const valorFinal = esNumero ? Number(valorDato) : valorDato.trim();

    registrar({ tipo: 'dato', campo: campoId, valor: valorFinal });
    cerrarModalDato();
  }

  // Filtrar alertas abiertas: críticas primero
  const alertasAbiertas = estado.alertas
    .filter(a => a.estado === 'abierta')
    .sort((a, b) => (a.severidad === 'critica' && b.severidad !== 'critica' ? -1 : a.severidad !== 'critica' && b.severidad === 'critica' ? 1 : 0));

  const totalAbiertas = alertasAbiertas.length;
  const tieneCritica = alertasAbiertas.some(a => a.severidad === 'critica');

  return (
    <>
      <section
        className={`bloque-atencion ${tieneCritica ? 'con-alerta-critica' : ''}`}
        aria-labelledby="atencion-titulo"
      >
        <div className="atencion-cabecera">
          <h2 id="atencion-titulo" className="atencion-titulo">Requiere atención</h2>
          {totalAbiertas > 0 && (
            <span className="contador-alertas" aria-label={`${totalAbiertas} alertas abiertas`}>
              {totalAbiertas}
            </span>
          )}
        </div>

        {totalAbiertas === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 0' }}>
            <span
              style={{
                width: esTablet ? '36px' : '48px',
                height: esTablet ? '36px' : '48px',
                borderRadius: '999px',
                background: 'var(--ok-fondo)',
                color: 'var(--ok)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width={esTablet ? '20' : '26'} height={esTablet ? '20' : '26'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: esTablet ? '17px' : '25px', fontWeight: 600 }}>Sin alertas abiertas</span>
              <span style={{ fontSize: esTablet ? '14px' : '19px', color: 'var(--tenue)' }}>
                Si falta algo, aparece aquí al instante.
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alertasAbiertas.map(alerta => {
              const esCritica = alerta.severidad === 'critica';
              const esDato = alerta.id.startsWith('dato:');

              return (
                <div key={alerta.id} className="alerta-item">
                  <div className="alerta-contenido">
                    {esCritica ? (
                      <svg width={esTablet ? '20' : '30'} height={esTablet ? '20' : '30'} viewBox="0 0 24 24" fill="none" stroke="var(--critica)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="Crítica">
                        <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                      </svg>
                    ) : (
                      <svg width={esTablet ? '20' : '30'} height={esTablet ? '20' : '30'} viewBox="0 0 24 24" fill="none" stroke="var(--aviso)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="Advertencia">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                      </svg>
                    )}
                    <div className="alerta-info">
                      <span className="alerta-mensaje">{alerta.mensaje}</span>
                      <span className="alerta-meta">
                        Desde {hora(alerta.desde)}.
                      </span>
                    </div>
                  </div>

                  {esTablet && (
                    <div className="alerta-acciones">
                      {esDato && (
                        <button
                          className="btn"
                          style={{ color: 'var(--azul)', borderColor: 'var(--azul)' }}
                          onClick={e => abrirModalDato(alerta, e)}
                        >
                          Registrar dato
                        </button>
                      )}
                      <button
                        className="btn"
                        onClick={e => abrirModalCierre(alerta, e)}
                      >
                        Cerrar con motivo
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal: Cerrar alerta con motivo */}
      {alertaParaCerrar && (
        <div className="modal-overlay" onClick={cerrarModalCierre}>
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cerrar-alerta"
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <h2 id="titulo-cerrar-alerta" style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 600, margin: 0 }}>
                Cerrar alerta con motivo
              </h2>
              <button
                className="btn"
                aria-label="Cancelar"
                style={{ minHeight: '44px', width: '44px', padding: 0 }}
                onClick={cerrarModalCierre}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '26px minmax(0, 1fr)', gap: '12px', alignItems: 'start', background: 'var(--critica-fondo)', borderRadius: '12px', padding: '14px 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--critica)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Crítica">
                <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--critica-osc)' }}>
                  {alertaParaCerrar.mensaje}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--critica-osc)' }}>
                  Abierta desde {hora(alertaParaCerrar.desde)}
                </span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '15px', color: 'var(--tinta-2)', lineHeight: 1.5 }}>
              La alerta queda cerrada con su motivo en la trazabilidad. No se borra nada y la cirugía sigue normalmente.
            </p>

            <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <legend style={{ fontSize: '15px', fontWeight: 600, color: 'var(--tenue)', paddingBottom: '6px' }}>
                Motivo
              </legend>
              {MOTIVOS_CIERRE.map(motivo => (
                <label
                  key={motivo}
                  className={`opcion-radio ${motivoSeleccionado === motivo ? 'seleccionada' : ''}`}
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={motivo}
                    checked={motivoSeleccionado === motivo}
                    onChange={() => setMotivoSeleccionado(motivo)}
                  />
                  {motivo}
                </label>
              ))}
            </fieldset>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '15px', fontWeight: 600, color: 'var(--tenue)' }}>
              Detalle, opcional
              <textarea
                rows={2}
                value={detalleCierre}
                onChange={e => setDetalleCierre(e.target.value)}
                style={{
                  font: '400 16px var(--texto)',
                  color: 'var(--tinta)',
                  border: '1px solid var(--borde-fuerte)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  resize: 'none',
                }}
              />
              <span style={{ fontWeight: 400, fontSize: '13px', color: 'var(--tenue)' }}>
                También puede dictarlo: «se cierra porque se administró en piso».
              </span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
              <button className="btn" onClick={cerrarModalCierre}>
                Cancelar
              </button>
              <button className="btn btn-primario" onClick={confirmarCierreAlerta}>
                Cerrar alerta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar dato preoperatorio faltante */}
      {alertaParaDato && (
        <div className="modal-overlay" onClick={cerrarModalDato}>
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-registrar-dato"
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 id="titulo-registrar-dato" style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 600, margin: 0 }}>
                Registrar dato del paciente
              </h2>
              <button
                className="btn"
                aria-label="Cancelar"
                style={{ minHeight: '44px', width: '44px', padding: 0 }}
                onClick={cerrarModalDato}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '15px', color: 'var(--tenue)' }}>
              {alertaParaDato.mensaje}
            </p>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '15px', fontWeight: 600 }}>
              Valor a registrar
              <input
                autoFocus
                type="text"
                value={valorDato}
                onChange={e => setValorDato(e.target.value)}
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
              <button className="btn" onClick={cerrarModalDato}>
                Cancelar
              </button>
              <button
                className="btn btn-primario"
                disabled={!valorDato.trim()}
                onClick={confirmarRegistroDato}
              >
                Guardar dato
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
