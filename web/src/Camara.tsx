import { useCallback, useEffect, useRef, useState } from 'react';
import type { Captura, EstadoCamara, EstadoCirugia, ModoCamara, MsgCliente } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { hora } from './etiquetas.ts';
import { generarQR, rutaQR } from './qr.ts';
import { ENCABEZADOS, cajaEnPorcentaje, filasConteo, formatearCodigo, momentoDelConteo, resumenCaptura } from './camara.ts';
import './camara.css';

export interface PropsCamara {
  cirugiaId: string;
  estado: EstadoCirugia;
  camara: EstadoCamara | null;
  codigo: { codigo: string; expira: number } | null;
  enviar: (m: MsgCliente) => void;
  onCuadro: (f: (jpeg: ArrayBuffer) => void) => () => void;
  verCamara: (ver: boolean) => void;
}

const conSegundos = (ts: string) =>
  new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Bogota' });

function IconoCamara({ color = 'currentColor', tam = 20 }: { color?: string; tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

/** La foto analizada, con una caja por objeto. SVG con el tamaño real de la imagen: las cajas quedan alineadas en cualquier pantalla. */
function FotoConCajas({ captura }: { captura: Captura }) {
  const src = `/api/capturas/${captura.id}/imagen`;
  const [tam, setTam] = useState<{ w: number; h: number; src: string } | null>(null);
  useEffect(() => {
    let vigente = true;
    const img = new Image();
    img.onload = () => { if (vigente) setTam({ w: img.naturalWidth, h: img.naturalHeight, src }); };
    img.src = src;
    return () => { vigente = false; };
  }, [src]);
  if (tam?.src !== src) return <p className="camara-vacio">Cargando la foto…</p>;
  const { w, h } = tam;
  const r = w / 70; // radio de la insignia, proporcional a la foto
  const numeros = new Map<string, number>();
  const indicador = captura.resultado.indicador;
  return (
    <svg className="camara-foto" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" role="img"
      aria-label={`Foto de las ${conSegundos(captura.ts)}: ${resumenCaptura(captura)}`}>
      <image href={src} width={w} height={h} />
      {captura.resultado.detecciones.map((d, i) => {
        const p = cajaEnPorcentaje(d.caja);
        const n = (numeros.get(d.material) ?? 0) + 1;
        numeros.set(d.material, n);
        const x = (d.caja[1] / 1000) * w + r * 1.2;
        const y = (d.caja[0] / 1000) * h + r * 1.2;
        return (
          <g key={i}>
            <title>{`${d.material}${d.cantidad > 1 ? ` (paquete de ${d.cantidad})` : ` ${n}`}`}</title>
            <rect className="camara-caja" x={p.left} y={p.top} width={p.width} height={p.height} rx={r / 3} />
            <circle className="camara-insignia" cx={x} cy={y} r={r} />
            <text className="camara-insignia-texto" x={x} y={y} dy="0.35em" textAnchor="middle" fontSize={r * 1.2}>
              {d.cantidad > 1 ? `×${d.cantidad}` : n}
            </text>
          </g>
        );
      })}
      {indicador?.caja && (() => {
        const p = cajaEnPorcentaje(indicador.caja);
        return <rect className={`camara-caja ${indicador.estado === 'viro' ? '' : 'critica'}`} x={p.left} y={p.top} width={p.width} height={p.height} rx={r / 3} />;
      })()}
    </svg>
  );
}

function PanelVincular({ codigo, conectada, enviar, onCerrar }: {
  codigo: PropsCamara['codigo']; conectada: boolean; enviar: PropsCamara['enviar']; onCerrar: () => void;
}) {
  const [ahora, setAhora] = useState(Date.now);
  useEffect(() => { enviar({ tipo: 'camara_codigo' }); }, [enviar]);
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (conectada) onCerrar(); }, [conectada, onCerrar]);
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  const vigente = codigo && codigo.expira > ahora ? codigo : null;
  const enlace = vigente ? `${location.origin}/camara#${vigente.codigo}` : '';
  const matriz = vigente ? generarQR(enlace) : null;
  const restante = vigente ? Math.ceil((vigente.expira - ahora) / 1000) : 0;

  return (
    <div className="camara-panel-fondo" onClick={onCerrar}>
      <div className="camara-panel" role="dialog" aria-modal="true" aria-labelledby="titulo-vincular" onClick={e => e.stopPropagation()}>
        <div className="camara-panel-cabecera">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 id="titulo-vincular">Conectar una cámara</h2>
            <span className="camara-sub" style={{ fontSize: 15 }}>Un celular sobre la mesa de instrumental hace de cámara. No hay que instalar nada.</span>
          </div>
          <button className="btn btn-icono" type="button" aria-label="Cerrar" onClick={onCerrar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        <div className="camara-panel-cuerpo">
          <div className="camara-qr-fila">
            <div className="camara-qr">
              <div className="camara-qr-marco">
                {matriz ? (
                  <svg width="192" height="192" viewBox={`0 0 ${matriz.length + 8} ${matriz.length + 8}`} role="img" aria-label="Código QR para conectar el celular" shapeRendering="crispEdges">
                    <path d={rutaQR(matriz, 4)} fill="var(--tinta)" />
                  </svg>
                ) : codigo ? (
                  <button className="btn" type="button" onClick={() => enviar({ tipo: 'camara_codigo' })}>Nuevo código</button>
                ) : <span>Generando…</span>}
              </div>
              <span>{vigente ? `El código vence en ${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')}` : codigo ? 'El código venció' : ''}</span>
            </div>
            <ol className="camara-pasos">
              <li className="camara-paso"><span className="camara-paso-numero">1</span><div><strong>Escanee el código con el celular</strong><span>Con la cámara del celular, en Chrome o Safari.</span></div></li>
              <li className="camara-paso"><span className="camara-paso-numero">2</span><div><strong>Permita usar la cámara</strong><span>El navegador lo pide una sola vez.</span></div></li>
              <li className="camara-paso"><span className="camara-paso-numero">3</span><div><strong>Ponga el celular en el soporte</strong><span>A unos 80 cm sobre la mesa, acostado y con toda la mesa en el cuadro.</span></div></li>
            </ol>
          </div>

          <div className="camara-esperando" role="status">
            <span className="camara-puntos" aria-hidden="true"><i /><i /><i /></span>
            <div><strong>Esperando al celular…</strong><span>Cuando se conecte, la imagen aparece en la sesión.</span></div>
          </div>

          {vigente && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h3 style={{ margin: 0, font: '600 15px var(--texto)', color: 'var(--tenue)' }}>¿El celular no lee el código?</h3>
              <p style={{ margin: 0, fontSize: 15, lineHeight: '22px', color: 'var(--tinta-2)' }}>
                Abra <strong>{location.host}/camara</strong> en el celular y escriba este código:
              </p>
              <span className="camara-codigo">{formatearCodigo(vigente.codigo)}</span>
            </div>
          )}

          <div className="camara-privacidad">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            <span>La cámara solo mira la mesa. El video no se guarda: cada conteo deja una foto en la trazabilidad, con la hora y quién lo confirmó.</span>
          </div>
        </div>

        <div className="camara-panel-pie">
          <span>Para probar sin celular, abra el enlace en otra ventana de este equipo.</span>
          {vigente && <a className="btn" href={enlace} target="_blank" rel="noreferrer">Abrir aquí</a>}
        </div>
      </div>
    </div>
  );
}

/** «Cámara de la mesa» en la tablet: el video del celular, el conteo que propone y las fotos que quedan en la trazabilidad. */
export function Camara({ cirugiaId, estado, camara, codigo, enviar, onCuadro, verCamara }: PropsCamara) {
  const [modo, setModo] = useState<ModoCamara>('conteo');
  const [vincular, setVincular] = useState(false);
  const [capturas, setCapturas] = useState<Captura[]>([]);
  const [fotoId, setFotoId] = useState<string | null>(null); // null: video en vivo
  const [pausado, setPausado] = useState(false);
  const [recibiendo, setRecibiendo] = useState(false);
  const video = useRef<HTMLImageElement>(null);
  const conectada = camara?.conectada ?? null;
  const analizando = camara?.analizando ?? false;
  const ultima = camara?.ultima ?? null;
  const ultimaVista = useRef(ultima?.id);
  const cerrarVincular = useCallback(() => setVincular(false), []);

  useEffect(() => {
    verCamara(!pausado);
    return () => verCamara(false);
  }, [pausado, verCamara]);

  useEffect(() => {
    let anterior = '';
    const quitar = onCuadro(jpeg => {
      const img = video.current;
      if (!img) return;
      const url = URL.createObjectURL(new Blob([jpeg], { type: 'image/jpeg' }));
      img.src = url;
      if (anterior) URL.revokeObjectURL(anterior);
      anterior = url;
      setRecibiendo(true);
    });
    return () => { quitar(); if (anterior) URL.revokeObjectURL(anterior); };
  }, [onCuadro]);

  useEffect(() => { if (!conectada) setRecibiendo(false); }, [conectada]);

  useEffect(() => {
    let vigente = true;
    api<Captura[]>(`/api/cirugias/${cirugiaId}/capturas`).then(c => { if (vigente) setCapturas(c); }, () => {});
    return () => { vigente = false; };
  }, [cirugiaId, ultima?.id]);

  // Una foto nueva se muestra sola, con lo que vio la cámara, mientras Conti pregunta.
  useEffect(() => {
    if (!ultima || ultima.id === ultimaVista.current) return;
    ultimaVista.current = ultima.id;
    setFotoId(ultima.id);
    setModo(ultima.modo);
  }, [ultima]);

  const buscar = (id: string | null) => capturas.find(c => c.id === id) ?? (ultima?.id === id ? ultima : null);
  const foto = buscar(fotoId);
  const delModo = (m: ModoCamara) => (foto?.modo === m ? foto : capturas.findLast(c => c.modo === m) ?? (ultima?.modo === m ? ultima : null));
  const conteo = delModo('conteo');
  const lectura = delModo('esterilizacion');
  const momento = momentoDelConteo(estado);
  const filas = filasConteo(estado, conteo);
  const [colRef, colCam, colRes] = ENCABEZADOS[momento];
  const fase = estado.protocolo.fases.find(f => f.items.some(i => i.id === 'esterilizacion'));
  const checkEsterilizacion = fase ? estado.checks[`${fase.id}.esterilizacion`] : undefined;
  const contar = () => enviar({ tipo: 'camara_contar', modo });

  return (
    <main className="camara-cuerpo">
      <section className="camara-principal" aria-labelledby="titulo-camara">
        <div className="camara-titulo-fila">
          <h2 id="titulo-camara" className="camara-titulo">Cámara de la mesa</h2>
          <div className="camara-modos" role="group" aria-label="Qué mira la cámara">
            <button className="camara-modo" type="button" aria-pressed={modo === 'conteo'} onClick={() => setModo('conteo')}>Conteo de material</button>
            <button className="camara-modo" type="button" aria-pressed={modo === 'esterilizacion'} onClick={() => setModo('esterilizacion')}>Indicador de esterilización</button>
          </div>
        </div>

        <div className="camara-visor">
          {foto ? (
            <>
              <FotoConCajas captura={foto} />
              <span className="camara-chip" style={{ left: 10, top: 10 }}>{resumenCaptura(foto)}</span>
              <span className="camara-chip" style={{ left: 10, bottom: 12 }}><IconoCamara tam={16} />Foto de las {conSegundos(foto.ts)}</span>
              <button className="btn-cabecera" type="button" onClick={() => setFotoId(null)}>Ver en vivo</button>
            </>
          ) : conectada ? (
            <>
              <img ref={video} className="camara-video" alt={`Video en vivo de la mesa desde ${conectada.dispositivo}`} hidden={!recibiendo || pausado} />
              {(!recibiendo || pausado) && (
                <div className="camara-vacio"><p>{pausado ? 'Video en pausa. La cámara sigue conectada y puede contar.' : 'Esperando el video del celular…'}</p></div>
              )}
              <span className="camara-chip" style={{ left: 10, bottom: 12 }}>
                <span className="camara-punto" aria-hidden="true" />{pausado ? 'En pausa' : 'En vivo'} · {conectada.dispositivo}
              </span>
              <button className="btn-cabecera" type="button" onClick={() => setPausado(p => !p)}>
                {pausado ? 'Reanudar' : 'Pausar'}
              </button>
            </>
          ) : (
            <div className="camara-vacio">
              <IconoCamara color="var(--sobre-navy)" tam={40} />
              <h3>No hay cámara conectada</h3>
              <p>Use un celular como cámara de la mesa: escanea un código, transmite y la cámara cuenta el material cuando se le pide.</p>
              <button className="btn btn-primario" type="button" onClick={() => setVincular(true)}>Conectar una cámara</button>
            </div>
          )}
          {analizando && <div className="camara-analizando" role="status">{modo === 'conteo' ? 'Contando la mesa…' : 'Leyendo el indicador…'}</div>}
        </div>

        <p className="camara-pie">
          <span>{modo === 'conteo'
            ? 'Cuenta lo que está en la mesa y en el contador de compresas. También se dice: «cámara, cuenta la mesa».'
            : 'Ponga el indicador y la etiqueta frente a la cámara. También se dice: «cámara, lee el indicador».'}</span>
          {conectada && (
            <button className="btn" type="button" onClick={() => enviar({ tipo: 'camara_desconectar' })}>Desconectar cámara</button>
          )}
        </p>
      </section>

      <aside className="camara-lateral">
        {modo === 'conteo' ? (
          <section className="camara-tarjeta" aria-labelledby="titulo-conteo-camara">
            <div className="camara-tarjeta-cabecera">
              <h2 id="titulo-conteo-camara">Conteo de la cámara</h2>
              <button className="btn btn-primario" type="button" onClick={contar} disabled={!conectada || analizando}>
                {conteo ? 'Contar otra vez' : 'Contar'}
              </button>
            </div>
            <span className="camara-sub">
              {!conectada ? 'Conecte una cámara para contar con ella.'
                : conteo ? `Foto de las ${conSegundos(conteo.ts)}, frente a lo que entró al campo.`
                  : 'Todavía no hay foto. Toque Contar con la mesa a la vista.'}
            </span>
            {filas.length > 0 && (
              <div>
                <div className="camara-fila encabezado"><span>Material</span><span>{colRef}</span><span>{colCam}</span><span>{colRes}</span></div>
                {filas.map(f => (
                  <div key={f.material} className={`camara-fila ${f.tono === 'falta' ? 'falta' : ''}`}>
                    <span>{f.material}</span>
                    <span>{f.referencia}</span>
                    <span>{f.camara ?? '—'}</span>
                    <span className={`camara-resultado ${f.tono}`}>{f.resultado}</span>
                  </div>
                ))}
              </div>
            )}
            {momento === 'durante' && conteo && (
              <span className="camara-sub">Durante la cirugía parte del material está en el campo: la cámara solo informa.</span>
            )}
            {conteo?.resultado.nota && <span className="camara-sub">Nota de la cámara: {conteo.resultado.nota}</span>}
          </section>
        ) : (
          <section className="camara-tarjeta" aria-labelledby="titulo-indicador">
            <div className="camara-tarjeta-cabecera">
              <h2 id="titulo-indicador">Indicador de esterilización</h2>
              <button className="btn btn-primario" type="button" onClick={contar} disabled={!conectada || analizando}>Leer indicador</button>
            </div>
            {lectura?.resultado.indicador ? (
              <div className="camara-indicador">
                {(() => {
                  const i = lectura.resultado.indicador;
                  const tono = i.estado === 'viro' ? 'ok' : i.estado === 'no_viro' ? 'critica' : 'neutro';
                  const texto = i.estado === 'viro' ? '✓ Viró: ciclo completo' : i.estado === 'no_viro' ? '! No viró' : '? No se ve con claridad';
                  return <span className={`camara-indicador-estado ${tono}`}>{texto}</span>;
                })()}
                <span>Lote: <strong>{lectura.resultado.indicador.lote ?? 'no legible'}</strong></span>
                <span>Vence: <strong>{lectura.resultado.indicador.vence ?? 'no legible'}</strong></span>
                <span className="camara-sub">Lectura de las {conSegundos(lectura.ts)}. Confirme mirando el indicador antes de decir sí.</span>
              </div>
            ) : (
              <span className="camara-sub">{conectada ? 'Todavía no se ha leído el indicador.' : 'Conecte una cámara para leer el indicador.'}</span>
            )}
            <span className="camara-sub">
              En el checklist: {checkEsterilizacion
                ? `${checkEsterilizacion.valor === 'si' ? 'verificado' : checkEsterilizacion.valor === 'no' ? 'no coincide' : 'no aplica'} a las ${hora(checkEsterilizacion.ts)}`
                : 'pendiente'}
            </span>
          </section>
        )}

        <section className="camara-tarjeta camara-fotos" aria-labelledby="titulo-fotos" style={{ flexGrow: 1 }}>
          <h3 id="titulo-fotos">Fotos de la cámara, en la trazabilidad</h3>
          {capturas.length === 0 ? (
            <span className="camara-sub">Cada conteo deja aquí su foto con la hora.</span>
          ) : (
            <div>
              {capturas.slice().reverse().map(c => (
                <div key={c.id} className={`camara-foto-fila ${c.id === fotoId ? 'activa' : ''}`}>
                  <IconoCamara color="var(--azul)" />
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span className="camara-foto-titulo">{c.modo === 'conteo' ? 'Conteo' : 'Indicador'} · {conSegundos(c.ts)}</span>
                    <span className="camara-foto-detalle">{resumenCaptura(c)}</span>
                  </div>
                  <button className="btn" type="button" aria-pressed={c.id === fotoId}
                    onClick={() => { setFotoId(c.id === fotoId ? null : c.id); setModo(c.modo); }}>
                    {c.id === fotoId ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </aside>

      {vincular && <PanelVincular codigo={codigo} conectada={Boolean(conectada)} enviar={enviar} onCerrar={cerrarVincular} />}
    </main>
  );
}
