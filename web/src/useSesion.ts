import { useCallback, useEffect, useRef, useState } from 'react';
import type { EstadoCirugia, FaseVoz, MsgCliente, MsgServidor, Pendiente } from '../../api/src/tipos.ts';
import { guardarPreferencia, preferencia } from './etiquetas.ts';

function nombreDispositivo(): string {
  const guardado = preferencia('hb_dispositivo');
  if (guardado) return guardado;
  const tipo = /Android|iPad|Tablet/i.test(navigator.userAgent) ? 'Tablet' : screen.width >= 1600 ? 'Pantalla' : 'Portátil';
  const nombre = `${tipo} ${Math.random().toString(36).slice(2, 6)}`;
  guardarPreferencia('hb_dispositivo', nombre);
  return nombre;
}

export function useSesion(cirugiaId: string) {
  const [estado, setEstado] = useState<EstadoCirugia | null>(null);
  const [microfono, setMicrofono] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [parcial, setParcial] = useState('');
  const [ultimoParcial, setUltimoParcial] = useState<number | null>(null);
  const [ultimaVoz, setUltimaVoz] = useState<{ fase: FaseVoz; en: number } | null>(null);
  const [aviso, setAviso] = useState('');
  const [dispositivo] = useState(nombreDispositivo);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    let activo = true;
    let intentos = 0;
    let reintento = 0;
    const conectar = () => {
      const s = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`);
      s.binaryType = 'arraybuffer';
      s.onopen = () => {
        intentos = 0;
        setAviso('');
        s.send(JSON.stringify({ tipo: 'unirse', cirugia_id: cirugiaId, dispositivo } satisfies MsgCliente));
      };
      s.onmessage = ev => {
        const m = JSON.parse(ev.data as string) as MsgServidor;
        if (m.tipo === 'estado') {
          setEstado(m.estado);
          setMicrofono(m.microfono);
          setPendiente(m.pendiente);
          setParcial('');
        } else if (m.tipo === 'parcial') {
          setParcial(m.texto);
          setUltimoParcial(Date.now());
        } else if (m.tipo === 'voz') {
          setUltimaVoz({ fase: m.fase, en: Date.now() });
        } else setAviso(m.texto);
      };
      s.onclose = () => {
        if (!activo) return;
        setAviso('Reconectando…');
        reintento = window.setTimeout(conectar, Math.min(10_000, 500 * 2 ** intentos++));
      };
      ws.current = s;
    };
    conectar();
    return () => {
      activo = false;
      clearTimeout(reintento);
      ws.current?.close();
    };
  }, [cirugiaId, dispositivo]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  const enviar = useCallback((m: MsgCliente) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(m));
  }, []);
  const enviarAudio = useCallback((pcm: Int16Array) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(pcm as unknown as BufferSource);
  }, []);

  return { estado, microfono, pendiente, parcial, ultimoParcial, ultimaVoz, aviso, dispositivo, enviar, enviarAudio };
}
