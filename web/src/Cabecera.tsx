import { useEffect, useState } from 'react';
import type { EstadoCirugia, MsgCliente } from '../../api/src/tipos.ts';
import type { Modo } from './props.ts';
import { alergiaVisible } from './marco.ts';

export interface PropsCabecera {
  estado: EstadoCirugia;
  modo: Modo;
  enviar: (m: MsgCliente) => void;
  onAlternarModo: () => void;
}

function obtenerHoraActual(): string {
  return new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota',
  });
}

// Vuelve a la pantalla de la que se vino (panel, trazabilidad o inicio); si se entró directo, a las cirugías de hoy.
function volver() {
  if (document.referrer.startsWith(location.origin) && history.length > 1) history.back();
  else location.assign('/');
}

export function Cabecera({ estado, modo, enviar, onAlternarModo }: PropsCabecera) {
  const [horaStr, setHoraStr] = useState(obtenerHoraActual);

  useEffect(() => {
    const t = setInterval(() => setHoraStr(obtenerHoraActual()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { cirugia } = estado;
  const { paciente } = cirugia;
  const alergia = alergiaVisible(estado.datos.alergias ?? cirugia.datos_preop.alergias);
  const sitio = estado.datos.sitio ? String(estado.datos.sitio) : (cirugia.datos_preop.sitio ? String(cirugia.datos_preop.sitio) : null);
  const textoQuirofano = cirugia.quirofano.toLowerCase().startsWith('qu') ? cirugia.quirofano : `Quirófano ${cirugia.quirofano}`;

  return (
    <header className="cabecera">
      <div className="cabecera-paciente-col">
        <div className="cabecera-nombre-fila">
          <h1 className="cabecera-nombre display">{paciente.nombre}</h1>
          {alergia && (
            <span className="cabecera-alergia" role="status">
              <svg
                width={modo === 'pared' ? 26 : 16}
                height={modo === 'pared' ? 26 : 16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={modo === 'pared' ? 2.2 : 2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              {alergia}
            </span>
          )}
        </div>
        <div className="cabecera-paciente-datos">
          <span>{paciente.edad} años</span>
          <span>{paciente.tipo_doc} {paciente.num_doc}</span>
          <span>HC {paciente.hc}</span>
          {modo === 'pared' && paciente.eps && <span>{paciente.eps}</span>}
        </div>
      </div>

      <div className="cabecera-cirugia-col">
        <span className="cabecera-procedimiento display">{cirugia.procedimiento}</span>
        {modo === 'pared' ? (
          <div className="cabecera-detalles">
            {sitio && <span>Sitio: {sitio}</span>}
            <span>Lateralidad: {cirugia.lateralidad}</span>
          </div>
        ) : (
          <span className="cabecera-detalles">
            {sitio ? `Sitio: ${sitio} · ` : ''}
            {cirugia.lateralidad && cirugia.lateralidad.toLowerCase() !== 'no aplica' ? `Lateralidad: ${cirugia.lateralidad} · ` : ''}
            {textoQuirofano}
          </span>
        )}
      </div>

      <div className="cabecera-acciones-col">
        <span className="cabecera-reloj display">{horaStr}</span>
        {modo === 'pared' ? (
          <div className="cabecera-botones">
            <button
              className="btn btn-cabecera btn-icono"
              type="button"
              aria-label="Volver a la vista anterior"
              title="Volver"
              onClick={volver}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <span className="cabecera-sala">{textoQuirofano}</span>
          </div>
        ) : (
          <div className="cabecera-botones">
            <button
              className="btn btn-cabecera btn-icono"
              type="button"
              aria-label="Volver a la vista anterior"
              title="Volver"
              onClick={volver}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              className="btn btn-cabecera"
              type="button"
              onClick={() => enviar({ tipo: 'deshacer' })}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
              </svg>
              Deshacer
            </button>
            <button
              className="btn btn-cabecera btn-icono"
              type="button"
              aria-label="Cambiar a modo pared"
              title="Modo pared"
              onClick={onAlternarModo}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
