import { useEffect, useState } from 'react';
import type { Sesion as Usuario } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { Login } from './Login.tsx';
import { Inicio } from './Inicio.tsx';
import { Sesion } from './Sesion.tsx';
import { Panel } from './Panel.tsx';
import { Trazabilidad } from './Trazabilidad.tsx';

// Rutas por pathname y navegación con <a href> (recarga completa): sin librería de rutas.
const SESION = /^\/sesion\/([0-9a-f-]{36})$/;
const TRAZABILIDAD = /^\/trazabilidad\/([0-9a-f-]{36})$/;

export function App() {
  const [yo, setYo] = useState<Usuario | null>();
  useEffect(() => { api<Usuario>('/api/yo').then(setYo, () => setYo(null)); }, []);
  if (yo === undefined) return null;
  if (yo === null) return <Login onEntrar={setYo} />;

  const ruta = location.pathname;
  const sesion = ruta.match(SESION);
  if (sesion) return <Sesion cirugiaId={sesion[1]} yo={yo} />;
  const traza = ruta.match(TRAZABILIDAD);
  if (traza) return <Trazabilidad cirugiaId={traza[1]} yo={yo} />;
  if (ruta === '/panel') return <Panel yo={yo} />;
  return <Inicio yo={yo} />;
}
