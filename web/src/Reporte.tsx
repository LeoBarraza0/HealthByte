import { useEffect, useState } from 'react';
import type { EstadoCirugia, Sesion as Usuario } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import { hora } from './etiquetas.ts';
import { armarReporte, type FilaReporte } from './reporte.ts';
import './reporte.css';

// «Control de consumos de cirugía» listo para imprimir o guardar en PDF desde el navegador.
// Diseño: Diseño/pantallas/Reporte-Consumo.html. Con ?imprimir=1 abre el diálogo de impresión al cargar.

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });

function Campo({ etiqueta, valor, ancho }: { etiqueta: string; valor?: string | null; ancho?: number }) {
  return (
    <div className="rp-cp" style={ancho ? { gridColumn: `span ${ancho}` } : undefined}>
      <span>{etiqueta}</span><b>{valor || ' '}</b>
    </div>
  );
}

// Lo que HealthByte no registra se deja en blanco, como en la planilla, para llenarlo a mano si hace falta.
function SiNo({ etiqueta }: { etiqueta: string }) {
  return <div className="rp-cp"><span>{etiqueta}</span><b className="rp-sn"><i>Sí</i><i>No</i></b></div>;
}

function Tabla({ titulo, filas, codigo }: { titulo: string; filas: FilaReporte[]; codigo?: boolean }) {
  return (
    <table className="rp-tb">
      <caption>{titulo}</caption>
      <thead>
        <tr><th className="rp-cs">Consumo</th><th>Elemento</th>{codigo && <th className="rp-cd">Código</th>}<th className="rp-t">Total</th></tr>
      </thead>
      <tbody>
        {filas.map(f => (
          <tr key={f.elemento + f.del_conteo} className={f.total ? 'rp-u' : undefined}>
            <td className="rp-cs">{f.consumo}</td>
            <td>{f.elemento}{f.del_conteo && <span className="rp-mc">conteo</span>}</td>
            {codigo && <td className="rp-cd" />}
            <td className="rp-t">{f.total || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Reporte({ cirugiaId }: { cirugiaId: string; yo: Usuario }) {
  const [estado, setEstado] = useState<EstadoCirugia | null>(null);
  const [error, setError] = useState('');
  const [generado] = useState(() => new Date());

  useEffect(() => {
    api<EstadoCirugia>(`/api/cirugias/${cirugiaId}`).then(setEstado, e => setError(String((e as Error).message)));
  }, [cirugiaId]);

  useEffect(() => {
    if (!estado || new URLSearchParams(location.search).get('imprimir') !== '1') return;
    void document.fonts.ready.then(() => window.print());
  }, [estado]);

  if (error) return <p className="rp-estado">No se pudo cargar la cirugía: {error}</p>;
  if (!estado) return <p className="rp-estado">Preparando el reporte…</p>;

  const c = estado.cirugia;
  const p = c.paciente;
  const equipo = c.equipo_programado;
  const r = armarReporte(estado);
  const registros = estado.eventos.length;
  const porVoz = estado.eventos.filter(e => e.origen === 'voz').length;
  const anestesia = [estado.datos.tipo_anestesia, equipo.anestesiologo?.nombre].filter(Boolean).join('. ');

  return (
    <div className="rp-fondo">
      <div className="rp-barra" role="toolbar" aria-label="Acciones del reporte">
        <a className="btn" href={`/trazabilidad/${cirugiaId}`}>Volver a la trazabilidad</a>
        <span>En el diálogo de impresión, elija «Guardar como PDF».</span>
        <button type="button" className="btn btn-primario" onClick={() => window.print()}>Descargar PDF</button>
      </div>

      <article className="rp-hoja" aria-label="Control de consumos de cirugía">
        <header className="rp-cabecera">
          <div className="rp-marca">
            <span className="display">Health<b>Byte</b></span>
            <span>Reporte generado del registro de la cirugía</span>
          </div>
          <h1 className="display">Control de consumos de cirugía</h1>
          <div className="rp-meta">
            <div><span>Código</span> <b>HB-CC-{c.id.slice(0, 6).toUpperCase()}</b></div>
            <div><span>Generado</span> <b>{fecha(generado.toISOString())} {hora(generado.toISOString())}</b></div>
            <div><span>Página</span> <b>1 de 1</b></div>
          </div>
        </header>

        <section>
          <h2 className="rp-sec">Datos generales</h2>
          <div className="rp-gr">
            <Campo etiqueta="Fecha" valor={fecha(c.fecha_programada)} />
            <Campo etiqueta="Nombre completo del paciente" valor={p.nombre} ancho={2} />
            <Campo etiqueta="Edad" valor={`${p.edad} años`} />
            <Campo etiqueta="N° de documento" valor={`${p.tipo_doc} ${p.num_doc}`} />
            <Campo etiqueta="Historia clínica" valor={p.hc} />
            <Campo etiqueta="Empresa" valor={p.eps} />
            <Campo etiqueta="Plan" />
            <Campo etiqueta="Atención" />
            <Campo etiqueta="Paciente" />
            <Campo etiqueta="Sexo" />
            <Campo etiqueta="Habitación" />
          </div>
        </section>

        <section>
          <h2 className="rp-sec">Datos de la cirugía</h2>
          <div className="rp-gr">
            <Campo etiqueta="Quirófano" valor={c.quirofano} />
            <Campo etiqueta="Paquete" />
            <Campo etiqueta="Hora de entrada a quirófano" valor={estado.horas.ingreso && hora(estado.horas.ingreso)} />
            <Campo etiqueta="Hora inicia cirugía" valor={estado.horas.inicio_cirugia && hora(estado.horas.inicio_cirugia)} />
            <Campo etiqueta="Cirujano" valor={equipo.cirujano?.nombre} ancho={2} />
            <Campo etiqueta="Hora termina cirugía" valor={estado.horas.fin_cirugia && hora(estado.horas.fin_cirugia)} />
            <Campo etiqueta="Hora de salida de quirófano" valor={estado.horas.salida_recuperacion && hora(estado.horas.salida_recuperacion)} />
            <Campo etiqueta="Procedimiento" valor={c.procedimiento} ancho={2} />
            <Campo etiqueta="Especialidad" valor={estado.protocolo.especialidad} />
            <Campo etiqueta="Lateralidad" valor={c.lateralidad} />
            <Campo etiqueta="Diagnóstico" valor={c.diagnostico} ancho={2} />
            <Campo etiqueta="Instrumentador(a)" valor={equipo.instrumentador?.nombre} />
            <Campo etiqueta="Auxiliar" valor={equipo.auxiliar_enfermeria?.nombre} />
            <Campo etiqueta="Anestesia" valor={anestesia} />
            <Campo etiqueta="Perfusión" valor={equipo.perfusionista?.nombre} />
            <SiNo etiqueta="Ayudantía general" />
            <SiNo etiqueta="Ayudantía especializada" />
            <SiNo etiqueta="Patología" />
            <SiNo etiqueta="Laboratorio" />
            <SiNo etiqueta="Congelación" />
            <SiNo etiqueta="Pediatría" />
          </div>
        </section>

        <div className="rp-columnas">
          <div>
            <Tabla titulo="Insumos generales" filas={r.generales} />
            <Tabla titulo="Insumos con código" filas={r.con_codigo} codigo />
          </div>
          <div>
            <Tabla titulo="Suturas" filas={r.suturas} />
            <Tabla titulo="Otros insumos" filas={r.otros} />
          </div>
        </div>

        {r.equipos.length > 0 && (
          <section>
            <h2 className="rp-sec">Equipos especiales</h2>
            <div className="rp-equipos">
              {r.equipos.map(g => (
                <div key={g.grupo} className="rp-eq">
                  <b>{g.grupo}</b>
                  {g.items.map(i => (
                    <span key={i.nombre} className="rp-ck"><i className={i.marcado ? 'on' : undefined}>{i.marcado ? '✓' : ''}</i>{i.nombre}</span>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="rp-firmas">
          <div><b>{equipo.instrumentador?.nombre ?? ' '}</b><span>Firma instrumentador(a)</span></div>
          <div><b>{equipo.auxiliar_enfermeria?.nombre ?? ' '}</b><span>Firma auxiliar</span></div>
          <div className="rp-resumen"><b>{r.elementos} elementos, {r.unidades} unidades</b><br />Del registro de la cirugía en HealthByte.</div>
        </div>

        <footer className="rp-pie">
          <p>
            Generado por HealthByte desde los {registros} registros de la cirugía: {porVoz} dictados por voz y {registros - porVoz} en la tablet,
            más las entradas del conteo de material, marcadas <span className="rp-mc">conteo</span>. Solo nombres y cantidades:
            los códigos de facturación y los precios los asigna la clínica en su propio proceso.
          </p>
          <p className="rp-copias"><span>Original: Historia clínica</span><span>Copia 1: Facturación</span><span>Copia 2: Farmacia</span></p>
        </footer>
      </article>
    </div>
  );
}
