import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avisoSinPropuesta, crearVinculos, ordenDeCamara, propuestaDeConteo, propuestaDeIndicador, resumenVisto } from './camara.ts';
import { derivar } from './estado.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';
import { cirugiaPrueba, ev, flujoHasta } from './prueba.ts';
import type { Evento, LecturaIndicador, ResultadoVision } from './tipos.ts';

const estado = (eventos: Evento[]) => derivar(cirugiaPrueba(), PROTOCOLO_CARDIO, eventos);

test('el código se canjea una sola vez, sin importar mayúsculas ni espacios, y vence a los 5 minutos', () => {
  let ahora = 0;
  const v = crearVinculos(() => ahora);
  const { codigo, expira } = v.emitir('cl-1', 'cir-1');
  assert.match(codigo, /^[2-9A-HJKMNP-Z]{8}$/);
  assert.equal(expira, 5 * 60_000);
  const escrito = `${codigo.slice(0, 4).toLowerCase()} ${codigo.slice(4)}`;
  const canje = v.canjear(escrito);
  assert.equal(canje?.cirugiaId, 'cir-1');
  assert.equal(canje?.clinicaId, 'cl-1');
  assert.equal(v.canjear(codigo), null);

  const otro = v.emitir('cl-1', 'cir-1').codigo;
  ahora = 5 * 60_000 + 1;
  assert.equal(v.canjear(otro), null);
});

test('el vínculo dura 12 horas y la tablet lo revoca al desconectar la cámara', () => {
  let ahora = 0;
  const v = crearVinculos(() => ahora);
  const { vinculo } = v.canjear(v.emitir('cl-1', 'cir-1').codigo)!;
  assert.equal(vinculo.length >= 32, true);
  ahora = 11 * 3_600_000;
  assert.deepEqual(v.validar(vinculo), { clinicaId: 'cl-1', cirugiaId: 'cir-1' });
  ahora = 12 * 3_600_000 + 1;
  assert.equal(v.validar(vinculo), null);

  ahora = 0;
  const otro = v.canjear(v.emitir('cl-1', 'cir-2').codigo)!.vinculo;
  const ajeno = v.canjear(v.emitir('cl-1', 'cir-3').codigo)!.vinculo;
  v.revocar('cir-2');
  assert.equal(v.validar(otro), null);
  assert.ok(v.validar(ajeno));
  assert.equal(v.validar('inventado'), null);
});

test('la orden de voz a la cámara se reconoce sin depender de Jev', () => {
  assert.equal(ordenDeCamara('Cámara, cuenta la mesa'), 'conteo');
  assert.equal(ordenDeCamara('camara conteo'), 'conteo');
  assert.equal(ordenDeCamara('Cámara, revisa la mesa por favor'), 'conteo');
  assert.equal(ordenDeCamara('Cámara, lee el indicador'), 'esterilizacion');
  assert.equal(ordenDeCamara('cámara, mira la cinta de esterilización'), 'esterilizacion');
  assert.equal(ordenDeCamara('Entran diez compresas'), null);
  assert.equal(ordenDeCamara('la cámara está borrosa'), null);
  assert.equal(ordenDeCamara('Cámara'), null);
});

test('antes de la incisión la cámara propone las entradas que faltan registrar', () => {
  const inicio = estado(flujoHasta('anestesia'));
  assert.deepEqual(propuestaDeConteo(inicio, { Compresas: 10, Gasas: 20 }), [
    { tipo: 'conteo', material: 'Compresas', cantidad: 10 },
    { tipo: 'conteo', material: 'Gasas', cantidad: 20 },
  ]);
  const conEntrada = estado([...flujoHasta('anestesia'), ev({ tipo: 'conteo', material: 'Compresas', cantidad: 10 }, 12)]);
  assert.deepEqual(propuestaDeConteo(conEntrada, { Compresas: 10 }), []);
  assert.deepEqual(propuestaDeConteo(conEntrada, { Compresas: 12 }), [{ tipo: 'conteo', material: 'Compresas', cantidad: 2 }]);
  assert.deepEqual(propuestaDeConteo(conEntrada, { Compresas: 8 }), []);
});

test('durante la cirugía la cámara solo informa: parte del material está en el campo', () => {
  const durante = estado(flujoHasta('inicio_cirugia'));
  assert.deepEqual(propuestaDeConteo(durante, { Compresas: 4, Gasas: 20 }), []);
});

test('al cierre propone las salidas, solo del material que entró al campo', () => {
  const cierre = estado(flujoHasta('fin_cirugia')); // entraron 10 compresas
  assert.deepEqual(propuestaDeConteo(cierre, { Compresas: 9, Hiladillos: 2 }), [{ tipo: 'conteo', material: 'Compresas', cantidad: -9 }]);
  const conSalida = estado([...flujoHasta('fin_cirugia'), ev({ tipo: 'conteo', material: 'Compresas', cantidad: -9 }, 112)]);
  assert.deepEqual(propuestaDeConteo(conSalida, { Compresas: 10 }), [{ tipo: 'conteo', material: 'Compresas', cantidad: -1 }]);
  assert.deepEqual(propuestaDeConteo(conSalida, { Compresas: 9 }), []);
});

test('el indicador de esterilización propone el ítem del checklist, salvo que no se vea o ya esté así', () => {
  const lectura = (e: LecturaIndicador['estado']): LecturaIndicador => ({ estado: e, lote: 'L-2210', vence: null, caja: null });
  const s = estado(flujoHasta('anestesia'));
  assert.deepEqual(propuestaDeIndicador(s, lectura('viro')), [{ tipo: 'check', fase: 'antes_incision', item: 'esterilizacion', valor: 'si' }]);
  assert.deepEqual(propuestaDeIndicador(s, lectura('no_viro')), [{ tipo: 'check', fase: 'antes_incision', item: 'esterilizacion', valor: 'no' }]);
  assert.deepEqual(propuestaDeIndicador(s, lectura('no_visible')), []);
  const verificado = estado([...flujoHasta('anestesia'),
    ev({ tipo: 'check', fase: 'antes_incision', item: 'esterilizacion', valor: 'si' }, 12, { rol_confirma: 'instrumentador' })]);
  assert.deepEqual(propuestaDeIndicador(verificado, lectura('viro')), []);
});

test('el resumen y el aviso dicen qué vio la cámara cuando no hay nada que confirmar', () => {
  const visto = (conteo: Record<string, number>): ResultadoVision => ({
    conteo, nota: null, indicador: null,
    detecciones: Object.entries(conteo).map(([material, cantidad]) => ({ material, cantidad, caja: [0, 0, 10, 10] })),
  });
  assert.equal(resumenVisto('conteo', visto({ Compresas: 9, Gasas: 20 })), 'Cámara: Compresas 9, Gasas 20');
  assert.equal(resumenVisto('esterilizacion', { ...visto({}), indicador: { estado: 'viro', lote: 'L-2210', vence: null, caja: null } }),
    'Cámara: indicador viró, lote L-2210');

  const conEntrada = estado([...flujoHasta('anestesia'), ev({ tipo: 'conteo', material: 'Compresas', cantidad: 10 }, 12)]);
  assert.equal(avisoSinPropuesta(conEntrada, 'conteo', visto({ Compresas: 10 })), 'La cámara coincide con lo registrado.');
  assert.equal(avisoSinPropuesta(conEntrada, 'conteo', visto({ Compresas: 8 })), 'La cámara no coincide en compresas: revise la tabla.');
  assert.equal(avisoSinPropuesta(conEntrada, 'conteo', visto({})), 'La cámara no encontró material en la mesa. Revise el encuadre.');
  assert.match(avisoSinPropuesta(estado(flujoHasta('inicio_cirugia')), 'conteo', visto({ Compresas: 3 })), /solo informa/);
  assert.match(avisoSinPropuesta(conEntrada, 'esterilizacion', visto({})), /no ve el indicador/);
});
