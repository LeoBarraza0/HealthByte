import { useState } from 'react';
import './landing.css';
const RUTA_LOGIN = '/entrar';
const trazos = {
  flecha: 'M5 12h14m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  reloj: 'M12 8v4l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
  escudo: 'M12 3 4 6v6c0 4 8 9 8 9s8-5 8-9V6l-8-3m-4 9 3 3 5-5',
  microfono: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8',
  alerta: 'm12 3 10 18H2L12 3m0 6v5m0 3v.2',
  ojo: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  volver: 'M19 12H5m6-6-6 6 6 6',
  mas: 'M12 5v14M5 12h14',
};
function Icono({ nombre, clase = '' }: { nombre: keyof typeof trazos; clase?: string }) {
  return <svg className={`icono ${clase}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={trazos[nombre]} /></svg>;
}
function Logo({ claro = false }: { claro?: boolean }) {
  return <span className={`logo${claro ? ' logo-claro' : ''}`}>
    <svg viewBox="0 0 112 112" aria-hidden="true"><g fill="currentColor"><rect x="40" width="32" height="32" rx="7" /><rect y="40" width="32" height="32" rx="7" /><rect x="40" y="40" width="32" height="32" rx="7" /><rect x="80" y="40" width="32" height="32" rx="7" /><rect x="40" y="80" width="32" height="32" rx="7" /></g><rect x="92" width="20" height="20" rx="5" fill="#2FB596" /></svg>
    <span>Health<span className="logo-byte">Byte</span></span>
  </span>;
}

const momentos = [
  { nombre: 'Entrada', titulo: 'Antes de la anestesia', completos: 3, total: 8, hora: '11:24', pendientes: ['Alergias', 'Riesgos relevantes'], verificados: ['Identidad del paciente', 'Procedimiento', 'Sitio y lateralidad'], frase: 'Confirmo identidad, procedimiento y sitio.', alerta: 'Alergia por validar', rol: 'Anestesiólogo' },
  { nombre: 'Inicio', titulo: 'Antes de la incisión', completos: 5, total: 7, hora: '11:46', pendientes: ['Antibiótico profiláctico', 'Riesgos previstos'], verificados: ['Paciente, procedimiento y sitio', 'Presentación del equipo', 'Esterilización del instrumental'], frase: 'Equipo quirúrgico completo en sala.', alerta: 'Antibiótico pendiente', rol: 'Anestesiólogo' },
  { nombre: 'Salida', titulo: 'Antes de salir del quirófano', completos: 1, total: 5, hora: '14:56', pendientes: ['Recuento de gasas y material', 'Identificación de muestras'], verificados: ['Recuento de instrumental'], frase: 'Salen nueve compresas.', alerta: 'Compresas: entraron 10, salieron 9', rol: 'Instrumentadora' },
];

function TableroEjemplo() {
  const [fase, setFase] = useState(1);
  const momento = momentos[fase];
  return <figure className="ejemplo">
    <div className="tablero-demo">
      <div className="demo-cabecera"><span><span className="punto" /> Quirófano 1</span><span>Ejemplo de cirugía</span><time>{momento.hora}</time></div>
      <div className="demo-momentos" aria-label="Explora los momentos del ejemplo">
        {momentos.map((m, i) => <button key={m.nombre} aria-pressed={i === fase} onClick={() => setFase(i)}><span>{m.nombre}</span><span>{i === fase ? 'Ahora' : i < fase ? 'Completado' : 'Siguiente'}</span></button>)}
      </div>
      <div className="demo-contenido" aria-live="polite" aria-atomic="true">
        <div className="demo-titulo"><h2>{momento.titulo}</h2><span><strong>{momento.completos}</strong> / {momento.total}</span></div>
        <div className="demo-pendientes"><span>Falta verificar</span>{momento.pendientes.map((item, i) => <div key={item}><span>{item}</span>{i === 0 ? <Icono nombre="alerta" /> : <span className="circulo-pendiente" />}</div>)}</div>
        <div className="demo-verificados"><span>Verificado</span>{momento.verificados.map(item => <div key={item}><span>{item}</span><Icono nombre="check" /></div>)}</div>
        <div className="demo-alerta"><Icono nombre="alerta" /><div><strong>{momento.alerta}</strong><span>Lo confirma: {momento.rol}</span></div></div>
      </div>
      <div className="demo-voz"><hb-conti state="verified" aria-hidden="true" /><div><span>Registrado por voz</span><p>«{momento.frase}»</p></div><Icono nombre="microfono" /></div>
    </div>
    <figcaption>Vista ilustrativa · Datos ficticios. Explora cada momento.</figcaption>
  </figure>;
}

export function Landing() {
  return <div className="hb-landing">
    <a className="saltar" href="#contenido">Saltar al contenido</a>
    <header className="cabecera contenedor"><a href="/" aria-label="HealthByte, inicio"><Logo /></a><nav aria-label="Navegación principal"><a href="#solucion">La solución</a><a href="#flujo">Cómo funciona</a><a href="#clinica">Para tu clínica</a></nav><a className="acceso-cabecera" href={RUTA_LOGIN}>Iniciar sesión <Icono nombre="flecha" /></a></header>
    <main id="contenido">
      <section className="hero contenedor" aria-labelledby="titulo-presentacion">
        <div className="hero-texto"><h1 id="titulo-presentacion">La seguridad de tu quirófano,<br /><span>a la vista de todos.</span></h1><p>Tu equipo se enfoca en cuidar. HealthByte acompaña cada verificación, mantiene visibles los pendientes y conserva la historia de cada cirugía.</p><div className="acciones"><a className="boton primario" href={RUTA_LOGIN}>Entrar a HealthByte <Icono nombre="flecha" /></a><a className="enlace-texto" href="#flujo">Conoce cómo funciona <span aria-hidden="true">↓</span></a></div><div className="hero-nota"><Icono nombre="microfono" /><span>Habla con naturalidad.<br /><strong>El tablero registra contigo.</strong></span></div></div>
        <TableroEjemplo />
      </section>
      <section className="promesa contenedor" aria-label="Lo que aporta HealthByte"><div><Icono nombre="microfono" /><span>Verificaciones<br /><strong>por voz y a mano</strong></span></div><div><Icono nombre="alerta" /><span>Pendientes y alertas<br /><strong>a la vista del equipo</strong></span></div><div><Icono nombre="reloj" /><span>Cada registro<br /><strong>con rol, hora y origen</strong></span></div></section>

      <section id="solucion" className="solucion contenedor" aria-labelledby="titulo-solucion"><div className="titulo-seccion"><h2 id="titulo-solucion">Que el cuidado<br />también deje huella.</h2><p>En el quirófano, la información importa tanto como el momento en que se comparte. HealthByte reúne al equipo alrededor de un mismo registro.</p></div><div className="beneficios"><article><Icono nombre="ojo" /><h3>Un equipo. La misma información.</h3><p>La pantalla de pared muestra el estado de la cirugía. La tablet permite registrar y confirmar sin perder de vista lo que sigue.</p></article><article><Icono nombre="escudo" /><h3>Lo pendiente tiene su lugar.</h3><p>Las verificaciones por completar y las alertas se muestran primero. El equipo atiende cada una y registra cómo se resolvió.</p></article><article><Icono nombre="reloj" /><h3>Una historia que permanece.</h3><p>Al terminar, queda el registro de verificaciones, tiempos y novedades. Las correcciones se conservan para entender lo que ocurrió.</p></article></div></section>

      <section id="flujo" className="flujo" aria-labelledby="titulo-flujo"><div className="contenedor"><div className="flujo-intro"><h2 id="titulo-flujo">Lo que se dice en sala,<br /><span>queda en el tablero.</span></h2><p>El equipo dicta una verificación. HealthByte la interpreta y la registra. Si necesita confirmar, pregunta antes de guardarla.</p></div><div className="recorrido"><div className="frase-ejemplo"><Icono nombre="microfono" /><blockquote>«Confirmo identidad,<br />procedimiento y sitio.»</blockquote><span>Una frase del equipo</span><div className="onda" aria-hidden="true">{Array.from({ length: 29 }, (_, i) => <i key={i} style={{ height: `${[8, 14, 24, 12, 34, 18, 40, 26, 15, 30][i % 10]}px` }} />)}</div></div><div className="resultado-ejemplo"><span className="estado-registrado"><Icono nombre="check" /> Registrado</span><h3>La verificación ya es visible.</h3><p>Identidad, procedimiento y sitio</p><div className="firma"><span>Confirmado por el equipo</span><span>11:24 · Por voz</span></div><small>Ejemplo ilustrativo con datos ficticios</small></div></div><div className="pausas"><h3>Contigo en cada momento de la cirugía.</h3><ol><li><span className="marca-momento" aria-hidden="true" /><h4>Antes de la anestesia</h4><p>Identidad, procedimiento, sitio, alergias y riesgos relevantes.</p></li><li><span className="marca-momento" aria-hidden="true" /><h4>Antes de la incisión</h4><p>Confirmación del equipo, antibiótico profiláctico y condiciones de seguridad.</p></li><li><span className="marca-momento" aria-hidden="true" /><h4>Antes de salir</h4><p>Recuento de material, muestras, novedades y procedimiento realizado.</p></li></ol><p className="nota-flujo">Durante la cirugía, también acompaña los conteos, los tiempos y las novedades.</p></div></div></section>

      <section id="clinica" className="clinica contenedor" aria-labelledby="titulo-clinica"><div><h2 id="titulo-clinica">Del quirófano<br />a una visión de tu clínica.</h2><p>La coordinación necesita más que saber si una cirugía terminó. Necesita poder revisar cómo se acompañó el protocolo.</p><ul className="lista-clinica"><li><Icono nombre="check" />Consulta qué se verificó y qué quedó pendiente.</li><li><Icono nombre="check" />Revisa los tiempos y la atención de las alertas.</li><li><Icono nombre="check" />Encuentra el registro de cada cirugía.</li></ul><a className="enlace-texto" href={RUTA_LOGIN}>Acceder a la plataforma <Icono nombre="flecha" /></a></div><div className="registro-ejemplo"><div className="registro-encabezado"><Icono nombre="reloj" /><span>Trazabilidad de una cirugía</span></div><h3>Cada paso cuenta.<br />Cada paso queda.</h3><ol><li><time>11:20</time><div><strong>Ingreso a sala</strong><span>Registrado por la circulante</span></div><span className="registro-punto" /></li><li><time>11:24</time><div><strong>Identidad, procedimiento y sitio</strong><span>Confirmados por el equipo · Por voz</span></div><span className="registro-punto" /></li><li><time>11:29</time><div><strong>Alergias verificadas</strong><span>Confirmadas por anestesia · Por voz</span></div><span className="registro-punto" /></li></ol><p>Ejemplo ilustrativo · Datos ficticios</p></div></section>

      <section className="preguntas contenedor" aria-labelledby="titulo-preguntas"><h2 id="titulo-preguntas">Para empezar,<br />con claridad.</h2><div><details><summary>¿Cómo se usa en el quirófano?<Icono nombre="mas" /></summary><p>Una tablet registra la voz y permite confirmar a mano. La pantalla de pared comparte el estado de la misma cirugía con todo el equipo. Solo un dispositivo escucha a la vez.</p></details><details><summary>¿Qué pasa si hay una alerta?<Icono nombre="mas" /></summary><p>Se destaca el pendiente para que el equipo lo atienda. Las alertas no bloquean el acto clínico: se resuelven o se cierran con un motivo, que queda en la trazabilidad.</p></details><details><summary>¿Quién puede acceder?<Icono nombre="mas" /></summary><p>El personal accede con la clínica, el usuario y la contraseña que le asigna su institución. Cada clínica consulta su propia información.</p></details><details><summary>¿Qué puedo explorar hoy?<Icono nombre="mas" /></summary><p>Esta presentación incluye un ejemplo interactivo del tablero y el acceso a la plataforma. HealthByte está en desarrollo; la demostración utiliza datos ficticios y sus funciones se habilitan por etapas.</p></details></div></section>

      <section className="cierre contenedor" aria-labelledby="titulo-cierre"><div><h2 id="titulo-cierre">Más claridad para tu equipo.<br /><span>Más trazabilidad para tu clínica.</span></h2><p>Precisión que se puede contar.</p></div><a className="boton boton-claro" href={RUTA_LOGIN}>Entrar a HealthByte <Icono nombre="flecha" /></a></section>
    </main>
    <footer className="pie contenedor"><a href="/" aria-label="HealthByte, inicio"><Logo /></a><p>Hecho para acompañar a quienes cuidan.</p><span>© {new Date().getFullYear()} HealthByte</span></footer>
  </div>;
}