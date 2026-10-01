import { Fragment, useEffect, useState } from 'react';
import type { EstadoCirugia, HoraId, MsgCliente } from '../../api/src/tipos.ts';
import type { Modo } from './props.ts';
import { hora } from './etiquetas.ts';
import { formatearMinutos, proximaHora, tramoMinutos } from './marco.ts';

export interface PropsPista {
  estado: EstadoCirugia;
  modo: Modo;
  enviar: (m: MsgCliente) => void;
}

interface DefNodo {
  id: HoraId;
  etiqueta: string;
}

interface DefTramo {
  desde: HoraId;
  hasta: HoraId;
  nombre: string;
}

const NODOS: readonly DefNodo[] = [
  { id: 'ingreso', etiqueta: 'Ingreso' },
  { id: 'anestesia', etiqueta: 'Anestesia' },
  { id: 'inicio_cirugia', etiqueta: 'Incisión' },
  { id: 'fin_cirugia', etiqueta: 'Fin' },
  { id: 'salida_recuperacion', etiqueta: 'A recuperación' },
];

const TRAMOS: readonly DefTramo[] = [
  { desde: 'ingreso', hasta: 'anestesia', nombre: 'Entrada' },
  { desde: 'anestesia', hasta: 'inicio_cirugia', nombre: 'Inicio' },
  { desde: 'inicio_cirugia', hasta: 'fin_cirugia', nombre: 'Durante' },
  { desde: 'fin_cirugia', hasta: 'salida_recuperacion', nombre: 'Salida' },
];

export function Pista({ estado, modo, enviar }: PropsPista) {
  const [ahoraMs, setAhoraMs] = useState(Date.now);

  useEffect(() => {
    const t = setInterval(() => setAhoraMs(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const proximoId = proximaHora(estado.horas);

  return (
    <section aria-label="Momentos de la cirugía" className="pista">
      {NODOS.map((nodo, idx) => {
        const ts = estado.horas[nodo.id];
        const registrado = Boolean(ts);
        const esProximo = !registrado && proximoId === nodo.id;

        const nodoElem = (
          <div
            key={`nodo-${nodo.id}`}
            className={`pista-nodo ${registrado ? 'registrado' : esProximo ? 'proximo' : 'futuro'}`}
          >
            <span className="pista-nodo-circulo">
              {registrado && (
                <svg
                  width={modo === 'pared' ? 18 : 13}
                  height={modo === 'pared' ? 18 : 13}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={modo === 'pared' ? 3 : 3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
              )}
            </span>
            <span className="pista-nodo-nombre">{nodo.etiqueta}</span>
            {registrado ? (
              <span className="pista-nodo-hora">{hora(ts)}</span>
            ) : esProximo && modo === 'tablet' ? (
              <button
                type="button"
                className="btn btn-marcar"
                onClick={() => enviar({ tipo: 'registrar', datos: { tipo: 'hora', hora: nodo.id } })}
              >
                Marcar
              </button>
            ) : modo === 'pared' ? (
              <span className="pista-nodo-hora pista-vacia">—</span>
            ) : null}
          </div>
        );

        if (idx === NODOS.length - 1) return nodoElem;

        const tramo = TRAMOS[idx];
        const desdeTs = estado.horas[tramo.desde];
        const hastaTs = estado.horas[tramo.hasta];
        const completado = Boolean(desdeTs && hastaTs);
        const esAhora = Boolean(desdeTs && !hastaTs);
        const minutos = tramoMinutos(desdeTs, hastaTs, ahoraMs);
        const textoMinutos = formatearMinutos(minutos);

        const tramoElem = (
          <div
            key={`tramo-${tramo.nombre}`}
            className={`pista-tramo ${completado ? 'completado' : esAhora ? 'ahora' : 'futuro'}`}
          >
            <div className="pista-tramo-barra" />
            <div className="pista-tramo-info">
              {esAhora ? (
                <>
                  <strong className="pista-tramo-destacado">{tramo.nombre} · ahora</strong>{' '}
                  <span className="pista-tramo-minutos">{textoMinutos}</span>
                </>
              ) : completado ? (
                <>
                  <strong className="pista-tramo-nombre">{tramo.nombre}</strong>{' '}
                  <span className="pista-tramo-minutos">{textoMinutos}</span>
                </>
              ) : (
                <span className="pista-tramo-inactivo">{tramo.nombre}</span>
              )}
            </div>
          </div>
        );

        return (
          <Fragment key={`par-${nodo.id}`}>
            {nodoElem}
            {tramoElem}
          </Fragment>
        );
      })}
    </section>
  );
}
