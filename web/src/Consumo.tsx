import type { DatosEvento, EstadoCirugia } from '../../api/src/tipos.ts';

export interface ConsumoProps {
  estado: EstadoCirugia;
  registrar: (d: DatosEvento) => void;
  onCerrar: () => void;
}

export function Consumo(_: ConsumoProps) {
  return null;
}
