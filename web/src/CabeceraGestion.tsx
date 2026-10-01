import type { Sesion as Usuario } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { ROLES } from './etiquetas.ts';
import './gestion.css';

export const esCoordinacion = (yo: Usuario) => yo.rol === 'coordinador' || yo.rol === 'admin';

export function Logo() {
  return (
    <span className="g-logo">
      <svg width="28" height="28" viewBox="0 0 112 112" aria-hidden="true">
        <rect x="40" y="0" width="32" height="32" rx="7" fill="var(--azul)" />
        <rect x="0" y="40" width="32" height="32" rx="7" fill="var(--azul)" />
        <rect x="40" y="40" width="32" height="32" rx="7" fill="var(--azul)" />
        <rect x="80" y="40" width="32" height="32" rx="7" fill="var(--azul)" />
        <rect x="40" y="80" width="32" height="32" rx="7" fill="var(--azul)" />
        <rect x="92" y="0" width="20" height="20" rx="5" fill="var(--menta)" />
      </svg>
      <span className="display">Health<b>Byte</b></span>
    </span>
  );
}

export function CabeceraGestion({ yo, actual }: { yo: Usuario; actual: 'inicio' | 'panel' | 'programacion' | 'personal' | 'otra' }) {
  const enlaces: [string, string, boolean][] = [['/', 'Cirugías de hoy', actual === 'inicio']];
  if (esCoordinacion(yo)) enlaces.push(
    ['/panel', 'Panel de gestión', actual === 'panel'],
    ['/programacion', 'Programación', actual === 'programacion'],
    ['/personal', 'Personal', actual === 'personal'],
  );
  return (
    <header className="g-cabecera">
      <div className="g-cabecera-in">
        <a href="/" className="g-inicio" aria-label="HealthByte, cirugías de hoy"><Logo /></a>
        <nav aria-label="Principal" className="g-nav">
          {enlaces.map(([href, texto, activo]) => (
            <a key={href} href={href} aria-current={activo ? 'page' : undefined}>{texto}</a>
          ))}
        </nav>
        <span className="g-usuario">{yo.nombre} <span>{ROLES[yo.rol]}</span></span>
        <button className="btn g-salir" onClick={() => api('/api/logout', {}).finally(() => location.assign('/'))}>Salir</button>
      </div>
    </header>
  );
}
