import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretar } from './interprete.ts';
import { derivar } from './estado.ts';
import { PROTOCOLO_CARDIO } from './protocolos.ts';
import { cirugiaPrueba, ev } from './prueba.ts';
import type { PreguntarFn, Respuesta } from './jev.ts';
import type { Evento } from './tipos.ts';

const jev = (r: Record<string, Respuesta>): PreguntarFn => async () => r;
const estado = (eventos: Evento[] = []) => derivar(cirugiaPrueba(), PROTOCOLO_CARDIO, eventos);
const noul = (p: number): Respuesta => ({ type: 'noul', noul: p });
const choice = (c: string, confidence: number): Respuesta => ({ type: 'choice', choice: c, confidence });

test('conteo: el código saca el número y Jev elige el material', async () => {
  const d = await interpretar('entran diez compresas', estado(), false, jev({
    dirigida: noul(0.97), intencion: choice('conteo', 0.95), movimiento: choice('entra', 0.99), material_0: choice('o0', 0.93),
  }));
  assert.deepEqual(d, {
    accion: 'registrar', eventos: [{ tipo: 'conteo', material: 'Compresas', cantidad: 10 }], confianza: 0.93, resumen: 'Compresas +10',
  });
});

test('la conversación del equipo se ignora', async () => {
  const d = await interpretar('¿alguien vio mi celular?', estado(), false, jev({ dirigida: noul(0.1), intencion: choice('nada', 0.9) }));
  assert.deepEqual(d, { accion: 'ignorar' });
});

test('con confianza media pide confirmación', async () => {
  const d = await interpretar('salen nueve compresas', estado(), false, jev({
    dirigida: noul(0.9), intencion: choice('conteo', 0.72), movimiento: choice('sale', 0.95), material_0: choice('o0', 0.9),
  }));
  assert.equal(d.accion, 'confirmar');
  assert.deepEqual(d.accion === 'confirmar' && d.eventos, [{ tipo: 'conteo', material: 'Compresas', cantidad: -9 }]);
});

test('una frase confirma varios ítems de la fase actual', async () => {
  const d = await interpretar('confirmo identidad, procedimiento y sitio', estado([ev({ tipo: 'hora', hora: 'ingreso' }, 0)]), false, jev({
    dirigida: noul(0.95), intencion: choice('check', 0.92), valor_check: choice('si', 0.95),
    item_identidad: noul(0.9), item_procedimiento: noul(0.88), item_sitio: noul(0.91), item_alergias: noul(0.1),
  }));
  assert.equal(d.accion, 'registrar');
  assert.deepEqual(d.accion === 'registrar' && d.eventos.map(e => e.tipo === 'check' && e.item), ['identidad', 'procedimiento', 'sitio']);
});

test('«sí» responde a la confirmación pendiente y se ignora si no hay ninguna', async () => {
  const r = { dirigida: noul(0.9), intencion: choice('si', 0.95) };
  assert.deepEqual(await interpretar('sí, confirmo', estado(), true, jev(r)), { accion: 'responder', si: true });
  assert.deepEqual(await interpretar('sí, confirmo', estado(), false, jev(r)), { accion: 'ignorar' });
});

test('una medición toma el valor de la frase', async () => {
  const d = await interpretar('glucometría ciento dos', estado(), false, jev({
    dirigida: noul(0.95), intencion: choice('medicion', 0.93), medicion: choice('o0', 0.9),
  }));
  assert.deepEqual(d.accion === 'registrar' && d.eventos, [{ tipo: 'medicion', medicion: 'glucometria', valor: 102 }]);
});

test('no envía la identidad del paciente a Jev', async () => {
  let enviado: unknown;
  const espia: PreguntarFn = async state => { enviado = state; return { dirigida: noul(0.1) }; };
  await interpretar('entra Prueba con cédula 41 728 305', estado(), false, espia);
  assert.equal((enviado as { frase: string }).frase, 'entra [PACIENTE] con cédula [ID]');
});

test('una frase dirigida que no se entiende queda marcada', async () => {
  const d = await interpretar('eh, el coso ese', estado(), false, jev({ dirigida: noul(0.8), intencion: choice('hito', 0.4) }));
  assert.deepEqual(d, { accion: 'ignorar', no_entendido: true });
});
