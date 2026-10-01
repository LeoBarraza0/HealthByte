import type { Modo } from './props.ts';

export function BarraVoz({ modo }: { modo: Modo }) {
  return (
    <section aria-label="Registro por voz" aria-live="polite" className="barra-voz">
      <div className="barra-voz-conti-bloque">
        <span style={{ width: modo === 'pared' ? 112 : 64 }} />
      </div>
    </section>
  );
}
