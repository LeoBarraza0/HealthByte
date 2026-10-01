/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoConti, type SenalesConti } from './estadoConti.ts';

const base: SenalesConti = {
  ahora: 10_000, microfonoActivo: true, ultimoParcial: null, pendiente: false,
  ultimaVoz: null, ultimaAlertaCritica: null, cierreSeguro: null,
};

test('sin micrófono está en pausa, aunque haya algo pendiente', () => {
  assert.equal(estadoConti({ ...base, microfonoActivo: false, pendiente: true }), 'paused');
});

test('la confirmación pendiente manda sobre todo lo demás', () => {
  assert.equal(estadoConti({ ...base, pendiente: true, ultimaAlertaCritica: 9_000 }), 'asking');
});

test('del procesamiento al registro y de vuelta al reposo', () => {
  assert.equal(estadoConti({ ...base, ultimaVoz: { fase: 'procesando', en: 9_800 } }), 'processing');
  assert.equal(estadoConti({ ...base, ultimaVoz: { fase: 'registrado', en: 9_000 } }), 'verified');
  assert.equal(estadoConti({ ...base, ultimaVoz: { fase: 'registrado', en: 7_000 } }), 'idle');
});

test('si alguien habla, escucha', () => {
  assert.equal(estadoConti({ ...base, ultimoParcial: 9_500, ultimaVoz: { fase: 'registrado', en: 9_000 } }), 'listening');
});

test('la conversación ignorada no cambia a Conti', () => {
  assert.equal(estadoConti({ ...base, ultimaVoz: { fase: 'ignorado', en: 9_900 } }), 'idle');
});

test('no entendió, alerta y cierre seguro', () => {
  assert.equal(estadoConti({ ...base, ultimaVoz: { fase: 'no_entendido', en: 9_000 } }), 'confused');
  assert.equal(estadoConti({ ...base, ultimaAlertaCritica: 8_000 }), 'alert');
  assert.equal(estadoConti({ ...base, cierreSeguro: 8_000 }), 'celebrate');
});
