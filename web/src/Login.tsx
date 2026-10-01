import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Sesion as Usuario } from '../../api/src/tipos.ts';
import { api } from './api.ts';
import './login.css';

export function Login(_: { onEntrar: (yo: Usuario) => void }) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [visible, setVisible] = useState(false);
  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const datos = new FormData(evento.currentTarget);
    setError(''); setEnviando(true);
    try {
      await api<Usuario>('/api/login', {
        clinica: String(datos.get('clinica')).trim(),
        usuario: String(datos.get('usuario')).trim(),
        clave: String(datos.get('clave')),
      });
      location.assign('/');
    } catch {
      setError('La clínica, el usuario o la contraseña no coinciden. Revise los tres y vuelva a intentar.');
      setEnviando(false);
    }
  }
  return <div className="hb-login">
    <section className="login-bienvenida" aria-label="Bienvenida">
      <a className="login-marca" href="/" aria-label="HealthByte, inicio"><svg width="30" height="30" viewBox="0 0 112 112" aria-hidden="true"><g fill="#4F95C0"><rect x="40" width="32" height="32" rx="7" /><rect y="40" width="32" height="32" rx="7" /><rect x="40" y="40" width="32" height="32" rx="7" /><rect x="80" y="40" width="32" height="32" rx="7" /><rect x="40" y="80" width="32" height="32" rx="7" /></g><rect x="92" width="20" height="20" rx="5" fill="#2FB596" /></svg><span>Health<b>Byte</b></span></a>
      <div className="login-conti"><hb-conti state="greeting" /><div><h2>Hola, soy Conti.</h2><p>Escucho la pausa de verificación y la anoto en el tablero. Inicie sesión para ver las cirugías de hoy.</p></div></div>
      <p className="login-nota">Datos ficticios de demostración.</p>
    </section>
    <main className="login-acceso"><form onSubmit={entrar} aria-labelledby="titulo-login" aria-busy={enviando}>
      <div><h1 id="titulo-login">Iniciar sesión</h1><p>Use el usuario que le asignó su clínica.</p></div>
      <div className="login-campo"><label htmlFor="clinica-login">Clínica</label><input id="clinica-login" name="clinica" required autoComplete="organization" autoCapitalize="none" aria-describedby="ayuda-clinica" disabled={enviando} /><span className="login-ayuda-clinica" id="ayuda-clinica">El código corto de su clínica, por ejemplo «caribe».</span></div>
      <label>Usuario<input name="usuario" required autoComplete="username" autoCapitalize="none" disabled={enviando} /></label>
      <div className="login-campo"><label htmlFor="clave-login">Contraseña</label><div className="login-clave"><input id="clave-login" name="clave" type={visible ? 'text' : 'password'} required autoComplete="current-password" disabled={enviando} /><button type="button" aria-label={visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña'} aria-pressed={visible} aria-controls="clave-login" disabled={enviando} onClick={() => setVisible(!visible)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg></button></div></div>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="login-enviar" type="submit" disabled={enviando}>{enviando ? 'Iniciando sesión…' : 'Iniciar sesión'}</button>
      <p className="login-ayuda">¿Olvidó la contraseña? Pídale a la coordinación de su clínica que la restablezca desde Personal.</p>
      <a className="login-volver" href="/">Volver a la presentación</a>
    </form></main>
  </div>;
}
