import type { DatosEvento, EstadoCirugia } from '../../api/src/tipos.ts';

/** Pared: solo muestra, con letra grande. Tablet: registro con controles táctiles. */
export type Modo = 'pared' | 'tablet';

/** Props de cada bloque de la sesión (Ahora, Atencion, Lateral). En modo pared no se llama a registrar. */
export interface PropsBloque { estado: EstadoCirugia; modo: Modo; registrar: (d: DatosEvento) => void }
