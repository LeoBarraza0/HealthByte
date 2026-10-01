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

// ---------- Cámara de la mesa ----------

function celular(): ClienteCamara & { recibidos: MsgAlCelular[]; cerrado: number | null } {
  const recibidos: MsgAlCelular[] = [];
  const c = { recibidos, cerrado: null as number | null, enviar: (m: MsgAlCelular) => { recibidos.push(m); }, cerrar: (codigo: number) => { c.cerrado = codigo; } };
  return c;
}

const visto = (conteo: Record<string, number>): ResultadoVision => ({
  conteo, nota: null, indicador: null,
  detecciones: Object.entries(conteo).map(([material, cantidad]) => ({ material, cantidad, caja: [0, 0, 100, 100] })),
});

function montarCamara(resultado: ResultadoVision, opciones: Partial<Deps> = {}) {
  const analizadas: { imagen: Uint8Array; modo: string; materiales: string[] }[] = [];
  const capturas: Parameters<NonNullable<Deps['guardarCaptura']>>[2][] = [];
  const interpretadas: string[] = [];
  const m = montar({ accion: 'ignorar' }, {
    interpretar: async frase => { interpretadas.push(frase); return { accion: 'ignorar' }; },
    analizar: async (imagen, modo, materiales) => { analizadas.push({ imagen, modo, materiales }); return resultado; },
    guardarCaptura: async (_clinica, _cirugia, c) => {
      capturas.push(c);
      return { id: `cap-${capturas.length}`, ts: '2026-10-01T14:55:12.000Z', modo: c.modo, resultado: c.resultado, dispositivo: c.dispositivo };
    },
    esperaFotoMs: 50,
    ...opciones,
  });
  return { ...m, analizadas, capturas, interpretadas };
}

type Salas = ReturnType<typeof montar>['salas'];

async function vincular(salas: Salas, tablet: ReturnType<typeof cliente>) {
  await salas.mensaje(tablet, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await salas.mensaje(tablet, { tipo: 'camara_codigo' });
  const msg = tablet.recibidos.findLast(m => m.tipo === 'camara_codigo');
  assert.ok(msg?.tipo === 'camara_codigo');
  const cel = celular();
  assert.equal(await salas.camara(cel, { tipo: 'vincular', codigo: msg.codigo, dispositivo: 'Celular A' }), true);
  const vinculada = cel.recibidos.find(m => m.tipo === 'vinculada');
  assert.ok(vinculada?.tipo === 'vinculada');
  return { cel, codigo: msg.codigo, vinculo: vinculada.vinculo, quirofano: vinculada.quirofano };
}

/** Espera a que la sala le pida la foto al celular y se la entrega. */
async function entregarFoto(salas: Salas, cel: ReturnType<typeof celular>, jpeg = [0xff, 0xd8, 9]) {
  for (let i = 0; i < 20 && !cel.recibidos.some(m => m.tipo === 'foto'); i++) await esperar(1);
  assert.ok(cel.recibidos.some(m => m.tipo === 'foto'));
  salas.cuadro(cel, Uint8Array.from([1, ...jpeg]));
}

test('el celular se vincula con el código de un solo uso y el video llega solo a quien lo pide', async () => {
  const { salas } = montar();
  const tablet = cliente('Tablet');
  const { cel, codigo, quirofano } = await vincular(salas, tablet);
  assert.equal(quirofano, 'QX 01');
  assert.deepEqual(cel.recibidos.at(-1), { tipo: 'viendo', n: 0 });
  assert.equal(ultimoEstado(tablet).camara.conectada?.dispositivo, 'Celular A');

  salas.cuadro(cel, Uint8Array.from([0, 0xff, 0xd8, 1]));
  assert.equal(tablet.cuadros.length, 0);
  await salas.mensaje(tablet, { tipo: 'camara_ver', ver: true });
  assert.deepEqual(cel.recibidos.at(-1), { tipo: 'viendo', n: 1 });
  salas.cuadro(cel, Uint8Array.from([0, 0xff, 0xd8, 1]));
  salas.cuadro(cel, Uint8Array.from([0, 1, 2, 3])); // no es JPEG
  assert.deepEqual(tablet.cuadros.map(b => [...b]), [[0xff, 0xd8, 1]]);

  assert.equal(await salas.camara(celular(), { tipo: 'vincular', codigo, dispositivo: 'Intruso' }), false);
  assert.equal(await salas.camara(celular(), { tipo: 'vincular', codigo: 'ZZZZZZZZ', dispositivo: 'Intruso' }), false);
  assert.equal(await salas.camara(celular(), { tipo: 'latido' }), false);
});

test('la cámara cuenta, Conti pregunta y con sí se registra con origen cámara', async () => {
  const { salas, guardados, analizadas, capturas } = montarCamara(visto({ Compresas: 10, Gasas: 20 }));
  const tablet = cliente('Tablet');
  const { cel } = await vincular(salas, tablet);
  const contando = salas.mensaje(tablet, { tipo: 'camara_contar', modo: 'conteo' });
  await entregarFoto(salas, cel);
  await contando;

  assert.deepEqual([...analizadas[0].imagen], [0xff, 0xd8, 9]);
  assert.equal(analizadas[0].modo, 'conteo');
  assert.deepEqual(analizadas[0].materiales, PROTOCOLO_CARDIO.materiales);
  assert.equal(capturas[0].pedida_por, 'u-circulante');
  assert.equal(capturas[0].dispositivo, 'Celular A');
  assert.ok(tablet.recibidos.some(m => m.tipo === 'estado' && m.camara.analizando));
  assert.ok(tablet.recibidos.some(m => m.tipo === 'voz' && m.fase === 'procesando'));

  const e = ultimoEstado(tablet);
  assert.equal(e.camara.analizando, false);
  assert.equal(e.camara.ultima?.id, 'cap-1');
  assert.equal(e.pendiente?.origen, 'camara');
  assert.equal(e.pendiente?.resumen, 'Compresas +10 · Gasas +20');
  assert.equal(guardados.length, 0);

  await salas.mensaje(tablet, { tipo: 'confirmar', si: true });
  assert.deepEqual(guardados.map(g => g.datos), [
    { tipo: 'conteo', material: 'Compresas', cantidad: 10 },
    { tipo: 'conteo', material: 'Gasas', cantidad: 20 },
  ]);
  assert.ok(guardados.every(g => g.origen === 'camara' && g.texto === 'Cámara: Compresas 10, Gasas 20' && g.registrado_por === 'u-circulante'));
});

test('«cámara, cuenta la mesa» pide la foto sin pasar por Jev', async () => {
  const { salas, voz, interpretadas, analizadas } = montarCamara(visto({ Compresas: 10 }));
  const tablet = cliente('Tablet');
  const { cel } = await vincular(salas, tablet);
  await salas.mensaje(tablet, { tipo: 'tomar_microfono' });
  voz().onFinal('Cámara, cuenta la mesa');
  await entregarFoto(salas, cel);
  await esperar(5);
  assert.deepEqual(interpretadas, []);
  assert.equal(analizadas.length, 1);
  assert.equal(ultimoEstado(tablet).pendiente?.origen, 'camara');
});

test('sin cámara, o si la foto no llega o falla el análisis, avisa y nada queda trabado', async () => {
  const sinCamara = montarCamara(visto({}));
  const sola = cliente('Tablet');
  await sinCamara.salas.mensaje(sola, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet' });
  await sinCamara.salas.mensaje(sola, { tipo: 'camara_contar', modo: 'conteo' });
  assert.equal(sola.recibidos.at(-1)?.tipo, 'aviso');

  const sinFoto = montarCamara(visto({ Compresas: 1 }));
  const tablet = cliente('Tablet');
  await vincular(sinFoto.salas, tablet);
  await sinFoto.salas.mensaje(tablet, { tipo: 'camara_contar', modo: 'conteo' }); // el celular nunca responde
  assert.match(tablet.recibidos.findLast(m => m.tipo === 'aviso')?.texto ?? '', /No se pudo analizar/);
  assert.equal(ultimoEstado(tablet).camara.analizando, false);
  assert.equal(sinFoto.capturas.length, 0);

  const falla = montarCamara(visto({}), { analizar: async () => { throw new Error('Vertex AI 403'); } });
  const otra = cliente('Tablet');
  const { cel } = await vincular(falla.salas, otra);
  const contando = falla.salas.mensaje(otra, { tipo: 'camara_contar', modo: 'conteo' });
  await entregarFoto(falla.salas, cel);
  await contando;
  assert.match(otra.recibidos.findLast(m => m.tipo === 'aviso')?.texto ?? '', /No se pudo analizar/);
  assert.equal(ultimoEstado(otra).pendiente, null);
});

test('si la foto no trae nada que registrar, avisa en lugar de preguntar', async () => {
  const { salas } = montarCamara(visto({}));
  const tablet = cliente('Tablet');
  const { cel } = await vincular(salas, tablet);
  const contando = salas.mensaje(tablet, { tipo: 'camara_contar', modo: 'conteo' });
  await entregarFoto(salas, cel);
  await contando;
  assert.equal(ultimoEstado(tablet).pendiente, null);
  assert.match(tablet.recibidos.findLast(m => m.tipo === 'aviso')?.texto ?? '', /no encontró material/);
});

test('la cámara sigue en la sala sin tablets, se reconecta con su vínculo y la tablet puede desconectarla', async () => {
  const { salas } = montar();
  const tablet = cliente('Tablet');
  const { cel, vinculo } = await vincular(salas, tablet);
  salas.salir(tablet);
  const otra = cliente('Tablet 2');
  await salas.mensaje(otra, { tipo: 'unirse', cirugia_id: CIRUGIA_ID, dispositivo: 'Tablet 2' });
  assert.equal(ultimoEstado(otra).camara.conectada?.dispositivo, 'Celular A');

  salas.salirCamara(cel);
  assert.equal(ultimoEstado(otra).camara.conectada, null);
  const reconectado = celular();
  assert.equal(await salas.camara(reconectado, { tipo: 'reanudar', vinculo, dispositivo: 'Celular A' }), true);
  assert.equal(ultimoEstado(otra).camara.conectada?.dispositivo, 'Celular A');

  const segundo = celular();
  await salas.mensaje(otra, { tipo: 'camara_codigo' });
  const codigo = otra.recibidos.findLast(m => m.tipo === 'camara_codigo');
  assert.ok(codigo?.tipo === 'camara_codigo');
  assert.equal(await salas.camara(segundo, { tipo: 'vincular', codigo: codigo.codigo, dispositivo: 'Celular B' }), true);
  assert.equal(reconectado.cerrado, 4003);

  await salas.mensaje(otra, { tipo: 'camara_desconectar' });
  assert.equal(segundo.cerrado, 4001);
  assert.equal(ultimoEstado(otra).camara.conectada, null);
  assert.equal(await salas.camara(celular(), { tipo: 'reanudar', vinculo, dispositivo: 'Celular A' }), false);
});
