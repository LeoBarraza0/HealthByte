// Código QR para vincular el celular como cámara: modo byte, corrección M, versiones 1 a 10 (hasta 213 bytes).
// Escrito a mano según ISO/IEC 18004 porque AGENTS.md no permite agregar dependencias.

/** Nivel M: códigos de corrección por bloque y grupos [bloques, códigos de datos por bloque], por versión. */
const BLOQUES_M: [number, [number, number][]][] = [
  [10, [[1, 16]]], [16, [[1, 28]]], [26, [[1, 44]]], [18, [[2, 32]]], [24, [[2, 43]]],
  [16, [[4, 27]]], [18, [[4, 31]]], [22, [[2, 38], [2, 39]]], [22, [[3, 36], [2, 37]]], [26, [[4, 43], [1, 44]]],
];
const ALINEACION = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

// Campo de Galois GF(256) con el polinomio x^8 + x^4 + x^3 + x^2 + 1.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++, x = (x << 1) ^ (x & 0x80 ? 0x11d : 0)) { EXP[i] = x; LOG[x] = i; }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

/** Los n códigos de corrección Reed-Solomon de un bloque de datos. */
export function correccion(datos: number[], n: number): number[] {
  let gen = [1];
  for (let i = 0; i < n; i++) {
    const sig = new Array<number>(gen.length + 1).fill(0);
    gen.forEach((g, j) => { sig[j] ^= g; sig[j + 1] ^= mul(g, EXP[i]); });
    gen = sig;
  }
  const resto = [...datos, ...new Array<number>(n).fill(0)];
  for (let i = 0; i < datos.length; i++) {
    const f = resto[i];
    if (f) gen.forEach((g, j) => { resto[i + j] ^= mul(g, f); });
  }
  return resto.slice(datos.length);
}

/** 15 bits de formato para el nivel M (00) y la máscara dada, con su BCH y la máscara fija 0x5412. */
export function bitsDeFormato(mascara: number): number {
  let r = mascara;
  for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
  return ((mascara << 10) | r) ^ 0x5412;
}

/** 18 bits de versión (solo desde la versión 7). */
export function bitsDeVersion(version: number): number {
  let r = version;
  for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
  return (version << 12) | r;
}

const MASCARAS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  x => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Códigos de datos y de corrección, ya intercalados entre bloques. */
function codigos(bytes: Uint8Array, version: number): number[] {
  const [nEc, grupos] = BLOQUES_M[version - 1];
  const capacidad = grupos.reduce((s, [n, d]) => s + n * d, 0);
  const bits: number[] = [];
  const poner = (v: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  poner(0b0100, 4);
  poner(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach(b => poner(b, 8));
  poner(0, Math.min(4, capacidad * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const datos: number[] = [];
  for (let i = 0; i < bits.length; i += 8) datos.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let relleno = 0xec; datos.length < capacidad; relleno ^= 0xec ^ 0x11) datos.push(relleno);

  const bloques: number[][] = [];
  let k = 0;
  for (const [n, d] of grupos) for (let i = 0; i < n; i++) { bloques.push(datos.slice(k, k + d)); k += d; }
  const ec = bloques.map(b => correccion(b, nEc));
  const salida: number[] = [];
  for (let i = 0; i < Math.max(...bloques.map(b => b.length)); i++) for (const b of bloques) if (i < b.length) salida.push(b[i]);
  for (let i = 0; i < nEc; i++) for (const e of ec) salida.push(e[i]);
  return salida;
}

/** Penalización de la norma para elegir la máscara que mejor se lee. */
function penalizacion(m: boolean[][]): number {
  const n = m.length;
  let p = 0;
  const lineas = [...m, ...m[0].map((_, x) => m.map(fila => fila[x]))];
  for (const l of lineas) {
    for (let i = 0, run = 1; i < n; i++, run++) {
      if (i === n - 1 || l[i] !== l[i + 1]) { if (run >= 5) p += run - 2; run = 0; }
    }
    const s = `0000${l.map(v => (v ? '1' : '0')).join('')}0000`; // fuera del símbolo todo es claro
    for (let i = s.indexOf('1011101'); i !== -1; i = s.indexOf('1011101', i + 1)) {
      if (s.slice(i - 4, i) === '0000' || s.slice(i + 7, i + 11) === '0000') p += 40;
    }
  }
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
    if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
  }
  const oscuros = m.flat().filter(Boolean).length;
  return p + Math.max(0, Math.ceil(Math.abs(oscuros * 20 - n * n * 10) / (n * n)) - 1) * 10;
}

/** Matriz del código [fila][columna]; true es un módulo oscuro. */
export function generarQR(texto: string): boolean[][] {
  const bytes = new TextEncoder().encode(texto);
  const version = BLOQUES_M.findIndex(([, g], i) => g.reduce((s, [n, d]) => s + n * d, 0) * 8 >= 4 + (i < 9 ? 8 : 16) + bytes.length * 8) + 1;
  if (!version) throw new Error('El texto es demasiado largo para el código QR');
  const n = 17 + 4 * version;
  const m = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const fijo = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const poner = (x: number, y: number, v: boolean) => { m[y][x] = v; fijo[y][x] = true; };

  for (let i = 0; i < n; i++) { poner(6, i, i % 2 === 0); poner(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < n && y >= 0 && y < n) poner(x, y, d !== 2 && d !== 4);
    }
  }
  const pos = ALINEACION[version - 1];
  pos.forEach((cy, i) => pos.forEach((cx, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) poner(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const formato = (mascara: number) => {
    const b = bitsDeFormato(mascara);
    const bit = (i: number) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) poner(8, i, bit(i));
    poner(8, 7, bit(6));
    poner(8, 8, bit(7));
    poner(7, 8, bit(8));
    for (let i = 9; i < 15; i++) poner(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) poner(n - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) poner(8, n - 15 + i, bit(i));
    poner(8, n - 8, true); // módulo oscuro fijo
  };
  formato(0); // reserva la zona; la máscara elegida se escribe al final
  if (version >= 7) {
    const b = bitsDeVersion(version);
    for (let i = 0; i < 18; i++) {
      const v = ((b >>> i) & 1) === 1;
      poner(n - 11 + (i % 3), Math.floor(i / 3), v);
      poner(Math.floor(i / 3), n - 11 + (i % 3), v);
    }
  }

  const datos = codigos(bytes, version);
  let k = 0;
  for (let derecha = n - 1; derecha >= 1; derecha -= 2) {
    if (derecha === 6) derecha = 5;
    for (let v = 0; v < n; v++) for (let j = 0; j < 2; j++) {
      const x = derecha - j;
      const y = ((derecha + 1) & 2) === 0 ? n - 1 - v : v;
      if (fijo[y][x]) continue;
      m[y][x] = k < datos.length * 8 && ((datos[k >>> 3] >>> (7 - (k & 7))) & 1) === 1;
      k++;
    }
  }

  const aplicar = (mascara: number) => {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fijo[y][x] && MASCARAS[mascara](x, y)) m[y][x] = !m[y][x];
    formato(mascara);
  };
  let mejor = 0;
  let menor = Infinity;
  for (let mascara = 0; mascara < 8; mascara++) {
    aplicar(mascara);
    const p = penalizacion(m);
    if (p < menor) { menor = p; mejor = mascara; }
    aplicar(mascara); // deshace la máscara: aplicarla dos veces es la identidad
  }
  aplicar(mejor);
  return m;
}

/** Trazo SVG de los módulos oscuros, desplazado por el margen claro que exige el lector. */
export function rutaQR(m: boolean[][], margen: number): string {
  let d = '';
  m.forEach((fila, y) => {
    for (let x = 0; x < fila.length; x++) {
      if (!fila[x]) continue;
      const desde = x;
      while (x + 1 < fila.length && fila[x + 1]) x++;
      const largo = x - desde + 1;
      d += `M${desde + margen} ${y + margen}h${largo}v1h-${largo}z`;
    }
  });
  return d;
}
