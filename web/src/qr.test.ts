import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bitsDeFormato, bitsDeVersion, correccion, generarQR, rutaQR } from './qr.ts';

test('Reed-Solomon da los códigos de corrección del ejemplo HELLO WORLD 1-M', () => {
  const datos = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  assert.deepEqual(correccion(datos, 10), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
});

test('los bits de formato y de versión coinciden con las tablas de la norma', () => {
  assert.equal(bitsDeFormato(0).toString(2).padStart(15, '0'), '101010000010010'); // nivel M, máscara 0
  assert.equal(bitsDeFormato(1).toString(2).padStart(15, '0'), '101000100100101'); // nivel M, máscara 1
  assert.equal(bitsDeVersion(7).toString(2).padStart(18, '0'), '000111110010010100');
});

test('elige la versión más chica que alcanza y dibuja los patrones de posición', () => {
  assert.equal(generarQR('HB').length, 21); // versión 1
  assert.equal(generarQR('x'.repeat(62)).length, 33); // versión 4: caben 62 bytes justos
  assert.equal(generarQR('x'.repeat(63)).length, 37); // versión 5
  const url = 'https://healthbyte-web-abcdefghij-ue.a.run.app/camara#K7Q2M9XD';
  const m = generarQR(url);
  const n = m.length;
  for (const [fila, col] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    assert.equal(m[fila][col], true); // esquina del patrón de posición
    assert.equal(m[fila + 1][col + 1], false); // anillo claro
    assert.equal(m[fila + 3][col + 3], true); // centro
  }
  assert.equal(m[m.length - 8][8], true); // módulo oscuro fijo
  assert.deepEqual(generarQR(url), m);
  assert.equal(generarQR('x'.repeat(200)).length, 57); // versión 10
  assert.throws(() => generarQR('x'.repeat(300)), /largo/);
});

test('la ruta SVG dibuja cada módulo oscuro con su margen', () => {
  const ruta = rutaQR([[true, true, false], [false, true, false], [false, false, false]], 4);
  assert.equal(ruta, 'M4 4h2v1h-2zM5 5h1v1h-1z');
});
