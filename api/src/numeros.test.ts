import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numerosConContexto, primerNumero } from './numeros.ts';

test('convierte palabras y dígitos a números', () => {
  assert.equal(primerNumero('entran diez compresas'), 10);
  assert.equal(primerNumero('glucometría ciento dos'), 102);
  assert.equal(primerNumero('ciento veinte'), 120);
  assert.equal(primerNumero('sale una compresa'), 1);
  assert.equal(primerNumero('diuresis 29 cc'), 29);
  assert.ok(Math.abs(primerNumero('peso setenta y uno punto tres kilos')! - 71.3) < 1e-9);
  assert.ok(Math.abs(primerNumero('peso 71,3')! - 71.3) < 1e-9);
  assert.equal(primerNumero('sin cifras aquí'), null);
});

test('corta cada número con las palabras que lo siguen, sin pisar el siguiente', () => {
  assert.deepEqual(numerosConContexto('entran diez compresas y veinte gasas'), [
    { valor: 10, span: 'diez compresas y' },
    { valor: 20, span: 'veinte gasas' },
  ]);
});
