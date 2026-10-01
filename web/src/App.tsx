import { useEffect, useState } from 'react';
import type { Sesion as Usuario } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { Login } from './Login.tsx';
import { Landing } from './Landing.tsx';
import { Inicio } from './Inicio.tsx';
import { Sesion } from './Sesion.tsx';
import { Panel } from './Panel.tsx';
import { Trazabilidad } from './Trazabilidad.tsx';
import { Programacion } from './Programacion.tsx';
import { Personal } from './Personal.tsx';
import { CelularCamara } from './CelularCamara.tsx';

// Rutas por pathname y navegación con <a href> (recarga completa): sin librería de rutas.
const SESION = /^\/sesion\/([0-9a-f-]{36})$/;
const TRAZABILIDAD = /^\/trazabilidad\/([0-9a-f-]{36})$/;

export function App() {
  const [yo, setYo] = useState<Usuario | null>();
  useEffect(() => { api<Usuario>('/api/yo').then(setYo, () => setYo(null)); }, []);
  useEffect(() => {
    if (yo && location.pathname === '/entrar') location.replace('/');
  }, [yo]);
  // El celular que hace de cámara no inicia sesión: entra con el código de un solo uso que muestra la tablet.
  if (location.pathname === '/camara') return <CelularCamara />;
  if (yo === undefined) return null;
  if (location.pathname === '/entrar') return yo ? null : <Login onEntrar={setYo} />;
  if (yo === null) return location.pathname === '/' ? <Landing /> : <Login onEntrar={setYo} />;

  const ruta = location.pathname;
  const sesion = ruta.match(SESION);
  if (sesion) return <Sesion cirugiaId={sesion[1]} yo={yo} />;
  const traza = ruta.match(TRAZABILIDAD);
  if (traza) return <Trazabilidad cirugiaId={traza[1]} yo={yo} />;
  if (ruta === '/panel') return <Panel yo={yo} />;
  if (ruta === '/programacion') return <Programacion yo={yo} />;
  if (ruta === '/personal') return <Personal yo={yo} />;
  return <Inicio yo={yo} />;
}
