import { useState, useEffect } from 'react';
import type { DatosEvento, EstadoCirugia } from '../../api/src/tipos.ts';
import { buscarInsumos } from './bloques.ts';
import './bloques.css';

export interface ConsumoProps {
  estado: EstadoCirugia;
  registrar: (d: DatosEvento) => void;
  onCerrar: () => void;
}

const CATEGORIAS = ['Todos', 'Generales', 'Suturas', 'Otros', 'Equipos'];

export function Consumo({ estado, registrar, onCerrar }: ConsumoProps) {
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCerrar();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCerrar]);

  const lineasRegistradas = estado.consumo.filter(l => !l.del_conteo);
  const lineasConteo = estado.consumo.filter(l => l.del_conteo);

  const insumosEncontrados = buscarInsumos(estado.insumos, textoBusqueda, categoriaActiva);

  function cantidadRegistrada(nombreInsumo: string): number {
    const l = estado.consumo.find(x => x.insumo.toLowerCase() === nombreInsumo.toLowerCase());
    return l ? l.cantidad : 0;
  }

  return (
    <div
      className="modal-overlay"
      onClick={onCerrar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(13, 34, 50, 0.55)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-consumo"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '600px',
          height: '100%',
          background: 'var(--blanco)',
          boxShadow: '-16px 0 48px rgba(13, 34, 50, 0.3)',
          display: 'grid',
          gridTemplateRows: 'auto minmax(0, 1fr) auto',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera */}
        <div style={{ padding: '22px 24px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', borderBottom: '1px solid var(--linea)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2 id="titulo-consumo" style={{ fontFamily: 'var(--display)', margin: 0, fontSize: '26px', lineHeight: '32px', fontWeight: 600 }}>
              Consumo de la cirugía
            </h2>
            <span style={{ fontSize: '15px', color: 'var(--tenue)' }}>
              Nombre y cantidad de lo que se usó. Los costos los maneja la clínica aparte.
            </span>
          </div>
          <button
            className="btn"
            aria-label="Cerrar"
            style={{ width: '44px', minHeight: '44px', padding: 0, flexShrink: 0 }}
            onClick={onCerrar}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div style={{ padding: '14px 24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {/* Líneas registradas manualmente */}
          <section aria-labelledby="seccion-registrado" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 id="seccion-registrado" style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: 'var(--tenue)' }}>
                Registrado
              </h3>
              <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>
                {lineasRegistradas.length} {lineasRegistradas.length === 1 ? 'insumo' : 'insumos'}
              </span>
            </div>

            {lineasRegistradas.length === 0 ? (
              <span style={{ fontSize: '14px', color: 'var(--tenue)', padding: '8px 0' }}>
                Sin insumos adicionales registrados.
              </span>
            ) : (
              lineasRegistradas.map(linea => (
                <div
                  key={linea.insumo}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 44px 48px 44px',
                    gap: '8px',
                    alignItems: 'center',
                    minHeight: '52px',
                    borderBottom: '1px solid var(--linea)',
                    fontSize: '16px',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{linea.insumo}</span>
                  <button
                    className="btn"
                    aria-label={`Quitar uno de ${linea.insumo}`}
                    style={{ width: '44px', minHeight: '44px', padding: 0 }}
                    onClick={() => registrar({ tipo: 'consumo', insumo: linea.insumo, cantidad: -1 })}
                  >
                    −
                  </button>
                  <strong style={{ textAlign: 'center', fontSize: '18px' }}>{linea.cantidad}</strong>
                  <button
                    className="btn"
                    aria-label={`Agregar uno de ${linea.insumo}`}
                    style={{ width: '44px', minHeight: '44px', padding: 0 }}
                    onClick={() => registrar({ tipo: 'consumo', insumo: linea.insumo, cantidad: 1 })}
                  >
                    +
                  </button>
                </div>
              ))
            )}
          </section>

          {/* Del conteo de material, solo lectura */}
          <section aria-labelledby="seccion-conteo" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 id="seccion-conteo" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--tenue)' }}>
              Del conteo de material, se suma solo
            </h3>
            {lineasConteo.length === 0 ? (
              <span style={{ fontSize: '14px', color: 'var(--tenue)' }}>Sin material en conteo aún.</span>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {lineasConteo.map(linea => (
                  <span
                    key={linea.insumo}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      minHeight: '36px',
                      padding: '0 12px',
                      borderRadius: '999px',
                      background: 'var(--linea)',
                      fontSize: '14px',
                      color: 'var(--tinta-2)',
                    }}
                  >
                    {linea.insumo} <b style={{ color: 'var(--tinta)' }}>{linea.cantidad}</b>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Agregar insumos del catálogo */}
          <section aria-labelledby="seccion-agregar" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 id="seccion-agregar" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--tenue)' }}>
              Agregar
            </h3>

            <label style={{ position: 'relative', display: 'block' }}>
              <span className="sr-solo">Buscar insumo</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--tenue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: 'absolute', left: '14px', top: '14px' }}>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={textoBusqueda}
                placeholder="Buscar insumo..."
                onChange={e => setTextoBusqueda(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  border: '2px solid var(--azul)',
                  borderRadius: '10px',
                  padding: '0 14px 0 44px',
                  font: '400 17px var(--texto)',
                  color: 'var(--tinta)',
                }}
              />
            </label>

            <div role="group" aria-label="Categoría" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {CATEGORIAS.map(cat => (
                <button
                  key={cat}
                  className="btn"
                  aria-pressed={categoriaActiva === cat}
                  style={{
                    minHeight: '40px',
                    padding: '0 14px',
                    borderRadius: '999px',
                    fontSize: '14px',
                    background: categoriaActiva === cat ? 'var(--azul)' : 'var(--blanco)',
                    color: categoriaActiva === cat ? 'var(--blanco)' : 'var(--tinta-2)',
                    borderColor: categoriaActiva === cat ? 'var(--azul)' : 'var(--borde-fuerte)',
                  }}
                  onClick={() => setCategoriaActiva(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div>
              {insumosEncontrados.slice(0, 20).map(insumo => {
                const cant = cantidadRegistrada(insumo.nombre);
                return (
                  <div
                    key={insumo.nombre}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      minHeight: '52px',
                      borderBottom: '1px solid var(--linea)',
                      fontSize: '16px',
                    }}
                  >
                    <span>
                      {insumo.nombre}
                      {cant > 0 && (
                        <span style={{ fontSize: '13px', color: 'var(--tenue)', marginLeft: '8px' }}>
                          ya registrada: {cant}
                        </span>
                      )}
                    </span>
                    <button
                      className="btn"
                      style={{ color: 'var(--azul)', borderColor: 'var(--azul)', minHeight: '44px', minWidth: '44px', padding: '0 12px' }}
                      onClick={() => registrar({ tipo: 'consumo', insumo: insumo.nombre, cantidad: 1 })}
                    >
                      +1
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Pie */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--linea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', background: 'var(--fondo)' }}>
          <span style={{ fontSize: '14px', lineHeight: '20px', color: 'var(--tinta-2)' }}>
            También se dicta: «consumo, dos pares de guantes».
          </span>
          <button
            className="btn btn-primario"
            style={{ flexShrink: 0, minHeight: '44px', padding: '0 20px' }}
            onClick={onCerrar}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
