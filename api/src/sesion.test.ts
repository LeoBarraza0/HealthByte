import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as esperar } from 'node:timers/promises';
import { crearSalas, validarDatos } from './sesion.ts';
import type { Cliente, ClienteCamara, Deps, EventosVoz } from './sesion.ts';
import { derivar } from './estado.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';
import { CIRUGIA_ID, SESION_PRUEBA, cirugiaPrueba } from './prueba.ts';
import type { Decision, MsgAlCelular, MsgServidor, NuevoEvento, ResultadoVision } from './tipos.ts';

function montar(decision: Decision = { accion: 'ignorar' }, extra: Partial<Deps> = {}) {
  const guardados: NuevoEvento[] = [];
  const audios: Uint8Array[] = [];
  let voz: EventosVoz | null = null;
  const salas = crearSalas({
    cargarEstado: async () => derivar(cirugiaPrueba(), PROTOCOLO_CARDIO, guardados.map((e, i) => ({
      ...e, id: `e${i}`, ts: new Date(Date.UTC(2026, 9, 1, 12, i)).toISOString(),
    }))),
    insertarEventos: async (_clinica, _cirugia, nuevos) => { guardados.push(...nuevos); },
    interpretar: async () => decision,
    abrirVoz: eventos => { voz = eventos; return { escribir: b => audios.push(b), cerrar() {} }; },
    esperaConfirmacionMs: 20,
    ...extra,
  });
  return { salas, guardados, audios, voz: () => voz! };
}

function cliente(dispositivo: string): Cliente & { recibidos: MsgServidor[]; cuadros: Uint8Array[] } {
  const recibidos: MsgServidor[] = [];
  const cuadros: Uint8Array[] = [];
  return { sesion: SESION_PRUEBA, dispositivo, recibidos, cuadros, enviar: m => recibidos.push(m), enviarCuadro: b => cuadros.push(b) };
}

const ultimoEstado = (c: { recibidos: MsgServidor[] }) =>
  c.recibidos.filter(m => m.tipo === 'estado').at(-1) as Extract<MsgServidor, { tipo: 'estado' }>;

test('un registro manual llega a todos los dispositivos de la sala', async () => {
  const { salas } = montar();
  const tv = cliente('TV');
  const tablet = cliente('Tablet');
  await salas.mensaje(tv, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'TV' });
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await salas.mensaje(tablet, { tipo: 'registrar', datos: { tipo: 'hora', hora: 'ingreso' } });
  assert.ok(ultimoEstado(tv).estado.horas.ingreso);
});

test('rechaza registros mal formados', async () => {
  const { salas, guardados } = montar();
  const tablet = cliente('Tablet');
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await salas.mensaje(tablet, { tipo: 'registrar', datos: { tipo: 'hora', hora: 'siesta' } as never });
  assert.equal(guardados.length, 0);
  assert.equal(tablet.recibidos.at(-1)?.tipo, 'aviso');
  assert.equal(validarDatos({ tipo: 'conteo', material: 'Gasas', cantidad: Infinity }), null);
  assert.deepEqual(validarDatos({ tipo: 'conteo', material: 'Gasas', cantidad: 5, extra: 1 }), { tipo: 'conteo', material: 'Gasas', cantidad: 5 });
});

test('solo admite las tres acciones del protocolo de conteo', async () => {
  const { salas, guardados } = montar();
  const tablet = cliente('Tablet');
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  for (const accion of ['cirujano_avisado', 'busqueda_en_campo', 'rx_solicitada'] as const) {
    await salas.mensaje(tablet, { tipo: 'registrar', datos: { tipo: 'accion_conteo', accion } });
  }
  assert.deepEqual(ultimoEstado(tablet).estado.acciones_conteo.map(a => a.accion),
    ['cirujano_avisado', 'busqueda_en_campo', 'rx_solicitada']);
  assert.equal(guardados.length, 3);
  assert.equal(validarDatos({ tipo: 'accion_conteo', accion: 'otra' }), null);
  assert.equal(validarDatos({ tipo: 'accion_conteo' }), null);
  assert.equal(validarDatos({ tipo: 'toString' }), null);
});

test('el consumo admite cantidades enteras distintas de cero', () => {
  assert.deepEqual(validarDatos({ tipo: 'consumo', insumo: 'Guantes, par', cantidad: 2 }), { tipo: 'consumo', insumo: 'Guantes, par', cantidad: 2 });
  assert.deepEqual(validarDatos({ tipo: 'consumo', insumo: 'Prolene', cantidad: -1 }), { tipo: 'consumo', insumo: 'Prolene', cantidad: -1 });
  for (const cantidad of [0, 1.5, 1000]) assert.equal(validarDatos({ tipo: 'consumo', insumo: 'Seda', cantidad }), null);
  assert.equal(validarDatos({ tipo: 'consumo', insumo: ' ', cantidad: 1 }), null);
});

test('una clínica no entra en la sala ya abierta por otra', async () => {
  const { salas, guardados } = montar();
  const tablet = cliente('Tablet');
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  const ajena = cliente('Otra clínica');
  ajena.sesion = { ...SESION_PRUEBA, clinica_id: 'cl-2' };
  await salas.mensaje(ajena, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Ajena' });
  await salas.mensaje(ajena, { tipo: 'registrar', datos: { tipo: 'hito', hito: 'Heparina' } });
  assert.deepEqual(ajena.recibidos.map(m => m.tipo), ['aviso']);
  assert.equal(guardados.length, 0);
});

test('solo el dueño del micrófono envía audio, y la voz registra con origen y texto', async () => {
  const { salas, guardados, audios, voz } = montar({
    accion: 'registrar', eventos: [{ tipo: 'conteo', material: 'Compresas', cantidad: 10 }], confianza: 0.93, resumen: 'Compresas +10',
  });
  const tv = cliente('TV');
  const tablet = cliente('Tablet');
  await salas.mensaje(tv, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'TV' });
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await salas.mensaje(tablet, { tipo: 'tomar_microfono' });
  assert.equal(ultimoEstado(tv).microfono, 'Tablet');
  salas.audio(tv, Buffer.from([1]));
  salas.audio(tablet, Buffer.from([2]));
  assert.deepEqual(audios, [Buffer.from([2])]);
  voz().onFinal('entran diez compresas');
  await esperar(5);
  assert.equal(guardados[0].origen, 'voz');
  assert.equal(guardados[0].texto, 'entran diez compresas');
  assert.equal(guardados[0].confianza, 0.93);
});

test('una confirmación pendiente se registra con sí y vence si nadie responde', async () => {
  const pedir: Decision = { accion: 'confirmar', eventos: [{ tipo: 'hito', hito: 'Heparina' }], confianza: 0.7, resumen: 'Heparina' };
  const a = montar(pedir);
  const tablet = cliente('Tablet');
  await a.salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await a.salas.mensaje(tablet, { tipo: 'tomar_microfono' });
  a.voz().onFinal('heparina');
  await esperar(5);
  assert.equal(ultimoEstado(tablet).pendiente?.resumen, 'Heparina');
  await a.salas.mensaje(tablet, { tipo: 'confirmar', si: true });
  assert.equal(a.guardados.length, 1);

  const b = montar(pedir);
  const otra = cliente('Tablet');
  await b.salas.mensaje(otra, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await b.salas.mensaje(otra, { tipo: 'tomar_microfono' });
  b.voz().onFinal('heparina');
  await esperar(40);
  assert.equal(ultimoEstado(otra).pendiente, null);
  assert.equal(b.guardados.length, 0);
});

test('deshacer anula el último evento', async () => {
  const { salas, guardados } = montar();
  const tablet = cliente('Tablet');
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await salas.mensaje(tablet, { tipo: 'registrar', datos: { tipo: 'hito', hito: 'Heparina' } });
  await salas.mensaje(tablet, { tipo: 'deshacer' });
  assert.deepEqual(guardados[1].datos, { tipo: 'anulacion', evento_id: 'e0' });
  assert.equal(ultimoEstado(tablet).estado.eventos.length, 0);
});

test('cuando sale el dueño, el micrófono queda libre', async () => {
  const { salas } = montar();
  const tv = cliente('TV');
  const tablet = cliente('Tablet');
  await salas.mensaje(tv, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'TV' });
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await salas.mensaje(tablet, { tipo: 'tomar_microfono' });
  salas.salir(tablet);
  assert.equal(ultimoEstado(tv).microfono, null);
});

test('avisa qué pasó con cada frase dictada', async () => {
  const a = montar({ accion: 'registrar', eventos: [{ tipo: 'hito', hito: 'Heparina' }], confianza: 0.95, resumen: 'Heparina' });
  const tablet = cliente('Tablet');
  await a.salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await a.salas.mensaje(tablet, { tipo: 'tomar_microfono' });
  a.voz().onFinal('heparina');
  await esperar(5);
  const fases = tablet.recibidos.flatMap(m => (m.tipo === 'voz' ? [m.fase] : []));
  assert.deepEqual(fases, ['procesando', 'registrado']);

  const b = montar({ accion: 'ignorar', no_entendido: true });
  const otra = cliente('Tablet');
  await b.salas.mensaje(otra, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await b.salas.mensaje(otra, { tipo: 'tomar_microfono' });
  b.voz().onFinal('ruido');
  await esperar(5);
  assert.equal(otra.recibidos.filter(m => m.tipo === 'voz').at(-1)?.fase, 'no_entendido');
});

test('corrige el instrumental antes de interpretar, registrar y difundir la voz', async () => {
  const s = derivar(cirugiaPrueba(), PROTOCOLO_CARDIO, []);
  s.instrumentos = [{ codigo: 'INS-030', nombre: 'Pinzas Kelly', categoria: 'Hemostasia' }];
  s.insumos = [{ nombre: 'Guantes, par', categoria: 'general' }];
  const guardados: NuevoEvento[] = [];
  let voz: EventosVoz;
  let vocabulario: string[] = [];
  let interpretada = '';
  const salas = crearSalas({
    cargarEstado: async () => s,
    insertarEventos: async (_clinica, _cirugia, eventos) => { guardados.push(...eventos); },
    interpretar: async frase => {
      interpretada = frase;
      return { accion: 'registrar', eventos: [{ tipo: 'novedad', texto: frase }], confianza: 0.95, resumen: frase };
    },
    abrirVoz: (eventos, frases) => { voz = eventos; vocabulario = frases; return { escribir() {}, cerrar() {} }; },
  });
  const tablet = cliente('Tablet');
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await salas.mensaje(tablet, { tipo: 'tomar_microfono' });
  voz!.onFinal('se cayó la pinza queli');
  await esperar(5);
  assert.equal(interpretada, 'se cayó la Pinzas Kelly');
  assert.equal(guardados[0].texto, 'se cayó la Pinzas Kelly');
  assert.deepEqual(guardados[0].datos, { tipo: 'novedad', texto: 'se cayó la Pinzas Kelly' });
  assert.ok(tablet.recibidos.filter(m => m.tipo === 'voz').every(m => m.texto === 'se cayó la Pinzas Kelly'));
  assert.ok(vocabulario.includes('Pinzas Kelly'));
  assert.ok(vocabulario.includes('Guantes, par'));
  salas.salir(tablet);
});
