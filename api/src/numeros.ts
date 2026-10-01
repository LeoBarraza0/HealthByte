const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const DECENAS: Record<string, number> = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const CENTENAS: Record<string, number> = { cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500 };

export interface NumeroEnFrase { valor: number; span: string }

export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function palabras(frase: string): string[] {
  return normalizar(frase).match(/\d+(?:[.,]\d+)?|[a-z]+/g) ?? [];
}

function leerEntero(t: string[], i: number): [number, number] | null {
  let j = i;
  let total = 0;
  let leyo = false;
  if (CENTENAS[t[j]] !== undefined) { total += CENTENAS[t[j]]; j++; leyo = true; }
  if (DECENAS[t[j]] !== undefined) {
    total += DECENAS[t[j]]; j++; leyo = true;
    if (t[j] === 'y' && UNIDADES[t[j + 1]] !== undefined && UNIDADES[t[j + 1]] < 10) { total += UNIDADES[t[j + 1]]; j += 2; }
  } else if (UNIDADES[t[j]] !== undefined) {
    total += UNIDADES[t[j]]; j++; leyo = true;
  }
  return leyo ? [total, j] : null;
}

function leerNumero(t: string[], i: number): [number, number] | null {
  if (/^\d/.test(t[i])) return [parseFloat(t[i].replace(',', '.')), i + 1];
  const entero = leerEntero(t, i);
  if (!entero) return null;
  let [valor, j] = entero;
  if (t[j] === 'punto' || t[j] === 'coma') {
    const decimal = leerEntero(t, j + 1);
    if (decimal) { valor += decimal[0] / 10 ** String(decimal[0]).length; j = decimal[1]; }
  }
  return [valor, j];
}

/** Cada número de la frase con hasta 3 palabras siguientes, cortando antes del próximo número. */
export function numerosConContexto(frase: string): NumeroEnFrase[] {
  const t = palabras(frase);
  const hallados: { valor: number; i: number; j: number }[] = [];
  for (let i = 0; i < t.length; ) {
    const n = leerNumero(t, i);
    if (n) { hallados.push({ valor: n[0], i, j: n[1] }); i = n[1]; } else i++;
  }
  return hallados.map((h, k) => ({
    valor: h.valor,
    span: t.slice(h.i, Math.min(h.j + 3, hallados[k + 1]?.i ?? t.length)).join(' '),
  }));
}

export function primerNumero(frase: string): number | null {
  return numerosConContexto(frase)[0]?.valor ?? null;
}
