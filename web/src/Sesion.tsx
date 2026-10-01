import { useCallback, useState } from 'react';
import type { DatosEvento, Sesion as Usuario } from '../../api/src/tipos.ts';
import type { Modo } from './props.ts';
import { guardarPreferencia, preferencia } from './etiquetas.ts';
import { useSesion } from './useSesion.ts';
import { Cabecera } from './Cabecera.tsx';
import { Pista } from './Pista.tsx';
import { BarraVoz } from './BarraVoz.tsx';
import { Ahora } from './Ahora.tsx';
import { Atencion } from './Atencion.tsx';
import { Lateral } from './Lateral.tsx';
import { Bitacora } from './Bitacora.tsx';
import './sesion.css';

export function Sesion({ cirugiaId }: { cirugiaId: string; yo: Usuario }) {
  const [pared, setPared] = useState(() => preferencia('hb_pared') === '1');
  const modo: Modo = pared ? 'pared' : 'tablet';

  const alternarModo = useCallback(() => {
    setPared(p => {
      const sig = !p;
      guardarPreferencia('hb_pared', sig ? '1' : '0');
      return sig;
    });
  }, []);

  const s = useSesion(cirugiaId);

  const registrar = useCallback(
    (datos: DatosEvento) => s.enviar({ tipo: 'registrar', datos }),
    [s.enviar],
  );

  if (!s.estado) {
    return (
      <div className={`sesion ${modo} conectando`}>
        <p>Conectando…</p>
      </div>
    );
  }

  return (
    <div className={`sesion ${modo}`}>
      <Cabecera
        estado={s.estado}
        modo={modo}
        enviar={s.enviar}
        onAlternarModo={alternarModo}
      />
      <Pista estado={s.estado} modo={modo} enviar={s.enviar} />
      <main className="sesion-cuerpo">
        <Ahora estado={s.estado} modo={modo} registrar={registrar} />
        <aside className="sesion-lateral">
          <Atencion estado={s.estado} modo={modo} registrar={registrar} />
          <Lateral estado={s.estado} modo={modo} registrar={registrar} />
          <Bitacora estado={s.estado} modo={modo} />
        </aside>
      </main>
      <BarraVoz
        estado={s.estado}
        modo={modo}
        microfono={s.microfono}
        pendiente={s.pendiente}
        parcial={s.parcial}
        ultimoParcial={s.ultimoParcial}
        ultimaVoz={s.ultimaVoz}
        aviso={s.aviso}
        dispositivo={s.dispositivo}
        enviar={s.enviar}
        enviarAudio={s.enviarAudio}
      />
    </div>
  );
}
