import { useEffect, useState } from 'react';
import type { CirugiaActiva, Sesion as Usuario } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { guardarPreferencia, hora, preferencia } from './etiquetas.ts';
import { CabeceraGestion, esCoordinacion } from './CabeceraGestion.tsx';

const hoy = () => new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' });
const numeroQuirofano = (nombre: string) => nombre.match(/\d+/)?.[0] ?? nombre;

export function Inicio({ yo }: { yo: Usuario }) {
  const [cirugias, setCirugias] = useState<CirugiaActiva[] | null>(null);
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState(() => preferencia('hb_dispositivo') ?? '');
  const [pared, setPared] = useState(() => preferencia('hb_pared') === '1');
  const [confirmar, setConfirmar] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);

  const cargar = () => api<CirugiaActiva[]>('/api/cirugias').then(setCirugias, e => setError(String(e.message ?? e)));
  useEffect(() => { void cargar(); }, []);

  const usar = (comoPared: boolean) => { setPared(comoPared); guardarPreferencia('hb_pared', comoPared ? '1' : '0'); };
  const reiniciar = async () => {
    setReiniciando(true);
    try { await api('/api/demo/reiniciar', {}); setConfirmar(false); await cargar(); }
    catch (e) { setError(String((e as Error).message)); }
    finally { setReiniciando(false); }
  };

  return (
    <div className="g-pagina">
      <CabeceraGestion yo={yo} actual="inicio" />
      <main className="g-inicio-main">
        <section aria-labelledby="hoy" className="g-cirugias">
          <div className="g-titulo">
            <h1 id="hoy">Cirugías de hoy</h1>
            <span>{hoy()}</span>
          </div>
          {error && <p role="alert" className="g-error">No se pudieron cargar las cirugías: {error}</p>}
          {!cirugias && !error && <p className="g-tenue">Cargando…</p>}
          {cirugias?.length === 0 && <p className="g-vacio">No hay cirugías programadas para hoy.</p>}
          {cirugias?.map(c => (
            <a key={c.id} className={c.en_curso ? 'g-tarjeta en-curso' : 'g-tarjeta'} href={`/sesion/${c.id}`}>
              <span className="g-quirofano"><span>Quirófano</span><b className="display">{numeroQuirofano(c.quirofano)}</b></span>
              <span className="g-datos">
                <b>{c.procedimiento}</b>
                <span>{c.paciente}. {c.especialidad}, programada {hora(c.fecha_programada)}.</span>
                <span className={c.en_curso ? 'g-estado vivo' : 'g-estado'}>{c.en_curso ? 'En curso' : 'Programada'}</span>
              </span>
              <span className="g-abrir">Abrir</span>
            </a>
          ))}
        </section>

        <aside aria-labelledby="dispositivo" className="g-dispositivo">
          <h2 id="dispositivo">Este dispositivo</h2>
          <label className="g-campo">Nombre visible
            <input value={nombre} placeholder="Tablet 3F" onChange={e => { setNombre(e.target.value); guardarPreferencia('hb_dispositivo', e.target.value); }} />
          </label>
          <fieldset className="g-uso">
            <legend>Se usa como</legend>
            <label className={!pared ? 'g-opcion activa' : 'g-opcion'}>
              <input type="radio" name="uso" checked={!pared} onChange={() => usar(false)} />
              <span><b>Registro</b><span>Escucha la voz y tiene controles táctiles. Para la tablet de la circulante.</span></span>
            </label>
            <label className={pared ? 'g-opcion activa' : 'g-opcion'}>
              <input type="radio" name="uso" checked={pared} onChange={() => usar(true)} />
              <span><b>Pared</b><span>Solo muestra, con letra grande. Para la TV o el tablero del quirófano.</span></span>
            </label>
          </fieldset>
          <p className="g-tenue">Varias pantallas pueden mostrar la misma cirugía. Solo una escucha a la vez; las demás ven desde dónde se está escuchando.</p>
          {esCoordinacion(yo) && (
            <div className="g-demo">
              {!confirmar
                ? <button className="btn" onClick={() => setConfirmar(true)}>Reiniciar demo</button>
                : (
                  <div role="group" aria-label="Confirmar reinicio" className="g-confirmar">
                    <span>¿Reiniciar la demo? La cirugía de hoy vuelve a empezar; el historial no se borra.</span>
                    <span className="g-botones">
                      <button className="btn btn-primario" disabled={reiniciando} onClick={reiniciar}>{reiniciando ? 'Reiniciando…' : 'Reiniciar'}</button>
                      <button className="btn" onClick={() => setConfirmar(false)}>Cancelar</button>
                    </span>
                  </div>
                )}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
