import { type FormEvent, useEffect, useId, useMemo, useState } from 'react';
import type { Integrante, NuevoIntegrante, Rol, Sesion as Usuario } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { CabeceraGestion, esCoordinacion } from './CabeceraGestion.tsx';
import { ROLES } from './etiquetas.ts';
import { generarClave, sugerirLogin } from './programacion.ts';
import './programacion.css';

const ROLES_LISTA = Object.keys(ROLES) as Rol[];

function iniciales(nombre?: string): string {
  if (!nombre) return '';
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function Personal({ yo }: { yo: Usuario }) {
  if (!esCoordinacion(yo)) {
    return (
      <div className="prog-pagina">
        <CabeceraGestion yo={yo} actual="personal" />
        <main style={{ maxWidth: 1440, margin: '0 auto', padding: '32px 40px' }}>
          <p className="g-tenue">Esta sección es para la coordinación de la clínica.</p>
        </main>
      </div>
    );
  }

  const [personal, setPersonal] = useState<Integrante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [desplegando, setDesplegando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('todos');

  // Paginación
  const [pagina, setPagina] = useState(1);

  // Formulario Nuevo Integrante
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<Rol>('cirujano');
  const [login, setLogin] = useState('');
  const [loginModificado, setLoginModificado] = useState(false);
  const [clave, setClave] = useState(() => generarClave());
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [exitoEnvio, setExitoEnvio] = useState<string | null>(null);

  const claveInputId = useId();

  // Cargar lista de personal
  const recargarPersonal = () => {
    setCargando(true);
    setErrorCarga(null);
    setDesplegando(false);

    api<Integrante[]>('/api/personal')
      .then(lista => {
        setPersonal(Array.isArray(lista) ? lista : []);
      })
      .catch((err: Error) => {
        if (/404|not found|no encontrad/i.test(err.message)) {
          setDesplegando(true);
        } else {
          setErrorCarga(err.message);
        }
      })
      .finally(() => {
        setCargando(false);
      });
  };

  useEffect(() => {
    recargarPersonal();
  }, []);

  // Filtrado de integrantes seguro ante campos nulos o faltantes
  const filtrados = useMemo(() => {
    const q = normalizar(filtroTexto);
    return personal.filter(p => {
      if (filtroRol !== 'todos' && p.rol !== filtroRol) return false;
      if (q) {
        const nombreNorm = p.nombre ? normalizar(p.nombre) : '';
        const loginNorm = p.login ? normalizar(p.login) : '';
        if (!nombreNorm.includes(q) && !loginNorm.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [personal, filtroTexto, filtroRol]);

  // Paginación
  const porPagina = 10;
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaValida = Math.min(pagina, totalPaginas);
  const inicioIdx = (paginaValida - 1) * porPagina;
  const finIdx = Math.min(inicioIdx + porPagina, filtrados.length);
  const itemsPagina = filtrados.slice(inicioIdx, finIdx);

  // Actualización de nombre y sugerencia de login
  const handleNombreChange = (nuevoNombre: string) => {
    setNombre(nuevoNombre);
    setExitoEnvio(null);
    if (!loginModificado) {
      setLogin(sugerirLogin(nuevoNombre));
    }
  };

  // Limpiar formulario
  const limpiarFormulario = () => {
    setNombre('');
    setRol('cirujano');
    setLogin('');
    setLoginModificado(false);
    setClave(generarClave());
    setErrorEnvio(null);
  };

  // Envío del nuevo integrante
  const handleGuardar = async (e: FormEvent) => {
    e.preventDefault();
    setErrorEnvio(null);
    setExitoEnvio(null);

    const nombreLimpio = nombre.trim();
    const loginLimpio = login.trim();

    if (!nombreLimpio) {
      setErrorEnvio('Ingrese el nombre completo.');
      return;
    }
    if (!loginLimpio) {
      setErrorEnvio('Ingrese el nombre de usuario.');
      return;
    }

    const payload: NuevoIntegrante = {
      nombre: nombreLimpio,
      rol,
      login: loginLimpio,
      clave,
    };

    setEnviando(true);
    try {
      await api<{ id: string }>('/api/personal', payload);
      setExitoEnvio(`Integrante ${nombreLimpio} guardado.`);
      limpiarFormulario();
      recargarPersonal();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      if (/409|conflict|ya existe|duplicad|repetid|existente/i.test(mensaje)) {
        setErrorEnvio('Ese usuario ya existe');
      } else if (/404|not found|no encontrad/i.test(mensaje)) {
        setErrorEnvio('Esta función se está desplegando');
      } else {
        setErrorEnvio(mensaje);
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="prog-pagina">
      <CabeceraGestion yo={yo} actual="personal" />

      <main className="pers-main">
        {/* Columna Izquierda: Lista de integrantes */}
        <div className="prog-col-izq">
          <div className="prog-encabezado">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 className="d" style={{ margin: 0, fontSize: 34, lineHeight: '40px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Personal
              </h1>
              <span style={{ fontSize: 15, color: 'var(--tenue)' }}>
                Quién inicia sesión y con qué rol aparece en el equipo de cada cirugía.
              </span>
            </div>

            <button
              type="button"
              className="btn btn-primario"
              aria-controls="nuevo"
              onClick={() => {
                document.getElementById('nuevo-nombre')?.focus();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Nuevo integrante
            </button>
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

          <section aria-labelledby="lista-personal" className="prog-pn" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 id="lista-personal" className="sr-solo">Integrantes</h2>

            {/* Búsqueda y filtros */}
            <form
              role="search"
              aria-label="Filtrar personal"
              onSubmit={e => e.preventDefault()}
              style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.8fr) minmax(160px, 1fr)', gap: 12, alignItems: 'end' }}
            >
              <label className="prog-fl">
                Buscar
                <input
                  type="search"
                  placeholder="Nombre o usuario"
                  value={filtroTexto}
                  onChange={e => {
                    setFiltroTexto(e.target.value);
                    setPagina(1);
                  }}
                />
              </label>

              <label className="prog-fl">
                Rol
                <select
                  value={filtroRol}
                  onChange={e => {
                    setFiltroRol(e.target.value);
                    setPagina(1);
                  }}
                >
                  <option value="todos">Todos</option>
                  {ROLES_LISTA.map(r => (
                    <option key={r} value={r}>{ROLES[r]}</option>
                  ))}
                </select>
              </label>
            </form>

            <span aria-live="polite" style={{ fontSize: 15 }}>
              <strong>{filtrados.length} {filtrados.length === 1 ? 'integrante' : 'integrantes'}</strong>
            </span>

            {/* Tabla de personal sin Último ingreso ni Acceso */}
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 480 }}>
                <div className="pers-fila pers-fila-encabezado">
                  <span>Nombre</span>
                  <span>Rol</span>
                  <span>Usuario</span>
                </div>

                {itemsPagina.length === 0 && !cargando && (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--tenue)' }}>
                    No se encontraron integrantes.
                  </div>
                )}

                {itemsPagina.map(p => (
                  <div key={p.id} className="pers-fila">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span aria-hidden="true" className="pers-avatar">
                        {iniciales(p.nombre)}
                      </span>
                      <span style={{ fontWeight: 600 }}>{p.nombre}</span>
                    </span>
                    <span>{ROLES[p.rol]}</span>
                    <span style={{ color: 'var(--tinta-2)' }}>{p.login}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Paginación */}
            {filtrados.length > 0 && (
              <nav
                aria-label="Páginas"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                  borderTop: '1px solid var(--linea)',
                  paddingTop: 16,
                  fontSize: 14,
                  color: 'var(--tenue)',
                }}
              >
                <span>
                  {inicioIdx + 1} a {finIdx} de {filtrados.length}
                </span>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="pg btn"
                    disabled={paginaValida <= 1}
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
                      className="pg btn"
                      aria-current={num === paginaValida ? 'page' : undefined}
                      aria-label={`Página ${num}`}
                      onClick={() => setPagina(num)}
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="pg btn"
                    disabled={paginaValida >= totalPaginas}
                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  >
                    Siguiente
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </nav>
            )}
          </section>
        </div>

        {/* Panel Derecho: Nuevo integrante */}
        <aside
          id="nuevo"
          aria-labelledby="titulo-nuevo"
          className="prog-pn prog-aside"
          style={{ position: 'sticky', top: 24 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h2 id="titulo-nuevo" className="d" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
              Nuevo integrante
            </h2>
            <button
              type="button"
              className="btn"
              aria-label="Cerrar sin guardar"
              style={{ minWidth: 44, padding: 0, border: 0 }}
              onClick={() => {
                limpiarFormulario();
                setExitoEnvio(null);
                setErrorEnvio(null);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {exitoEnvio && (
            <div className="prog-exito" role="status">
              <span>{exitoEnvio}</span>
            </div>
          )}

          {errorEnvio && (
            <div className="prog-error" role="alert">
              {errorEnvio}
            </div>
          )}

          <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <label className="prog-fl">
              Nombre completo
              <input
                id="nuevo-nombre"
                type="text"
                placeholder="Ej: Sofía Mendoza Ariza"
                value={nombre}
                onChange={e => handleNombreChange(e.target.value)}
                autoComplete="off"
                required
              />
            </label>

            <label className="prog-fl">
              Rol
              <select
                value={rol}
                onChange={e => setRol(e.target.value as Rol)}
              >
                {ROLES_LISTA.map(r => (
                  <option key={r} value={r}>{ROLES[r]}</option>
                ))}
              </select>
              <span className="prog-ay">
                Define en qué lugar del equipo se puede programar y qué ítems del checklist confirma.
              </span>
            </label>

            <label className="prog-fl">
              Usuario
              <input
                type="text"
                value={login}
                onChange={e => {
                  const val = e.target.value;
                  setLogin(val);
                  setLoginModificado(val.trim() !== '');
                }}
                autoCapitalize="none"
                required
              />
              <span className="prog-ay">
                Con este nombre inicia sesión. Lo sugerimos a partir del nombre.
              </span>
            </label>

            <div className="prog-fl">
              <label htmlFor={claveInputId}>Contraseña inicial</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id={claveInputId}
                  type="text"
                  value={clave}
                  readOnly
                  style={{ letterSpacing: '0.02em' }}
                />
                <button
                  type="button"
                  className="btn"
                  style={{ flexShrink: 0 }}
                  onClick={() => setClave(generarClave())}
                >
                  Generar otra
                </button>
              </div>
              <span className="prog-ay">
                Se muestra solo ahora. Entréguela en persona.
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button
                type="submit"
                className="btn btn-primario"
                disabled={enviando}
              >
                {enviando ? 'Guardando…' : 'Guardar integrante'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  limpiarFormulario();
                  setExitoEnvio(null);
                  setErrorEnvio(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </aside>
      </main>
    </div>
  );
}
