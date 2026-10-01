import type { EstadoCirugia } from '../../api/src/tipos.ts';
import type { Modo } from './props.ts';
import { describir, hora } from './etiquetas.ts';

/** Los últimos registros de la cirugía, en vivo: muestra el avance sin salir de la sesión. */
export function Bitacora({ estado, modo }: { estado: EstadoCirugia; modo: Modo }) {
  const ultimos = estado.eventos.slice(-8).reverse();
  return (
    <section aria-labelledby="bitacora" className="bitacora">
      <div className="bitacora-titulo">
        <h2 id="bitacora">Registro de la cirugía</h2>
        <span>{estado.eventos.length} {estado.eventos.length === 1 ? 'registro' : 'registros'}</span>
      </div>
      {ultimos.length === 0
        ? <p className="bitacora-vacio">Todavía no hay registros. Lo que se diga o se marque aparece aquí al instante.</p>
        : (
          <ol>
            {ultimos.map(e => (
              <li key={e.id}>
                <time>{hora(e.ts)}</time>
                <span>{describir(e.datos, estado.protocolo)}</span>
                <span className="bitacora-origen">{e.origen === 'voz' ? 'Voz' : e.origen === 'manual' ? 'Toque' : 'Cámara'}</span>
              </li>
            ))}
          </ol>
        )}
      {modo === 'tablet' && <a className="bitacora-todo" href={`/trazabilidad/${estado.cirugia.id}`}>Ver la trazabilidad completa</a>}
    </section>
  );
}
