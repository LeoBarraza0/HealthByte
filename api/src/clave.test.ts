import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashClave, verificarClave } from './clave.ts';

test('verifica la clave correcta y rechaza las demás', () => {
  const h = hashClave('secreta');
  assert.ok(verificarClave('secreta', h));
  assert.ok(!verificarClave('otra', h));
  assert.ok(!verificarClave('secreta', 'mal-formado'));
});

test('rechaza hashes inválidos sin lanzar y usa una sal distinta para cada clave', () => {
  const h = hashClave('secreta');
  assert.notEqual(hashClave('secreta'), h);
  for (const guardado of ['sal:00', 'sal:zz', `${h}:extra`, h.slice(0, -1)]) {
    assert.equal(verificarClave('secreta', guardado), false);
  }
});
