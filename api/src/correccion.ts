// Corrige en una frase dictada los nombres del catálogo que Chirp transcribió mal («pinza queli» → «Pinzas Kelly»).
// Compara por sonido: pliega las grafías que en español suenan igual y tolera una letra de error cada 6.

/** Pasa a minúsculas sin tildes y unifica grafías de igual sonido (qu/c/k, z/s, v/b, h muda, letras dobles). */
export function plegar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/qu/g, 'k').replace(/c([aou])/g, 'k$1').replace(/c([ei])/g, 's$1').replace(/z/g, 's')
    .replace(/v/g, 'b').replace(/h/g, '').replace(/y\b/g, 'i')
    .replace(/([a-z])\1+/g, '$1')
    .replace(/\s+/g, ' ').trim();
}

function distancia(a: string, b: string): number {
  let previa = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const fila = [i];
    for (let j = 1; j <= b.length; j++) {
      fila[j] = Math.min(previa[j] + 1, fila[j - 1] + 1, previa[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previa = fila;
  }
  return previa[b.length];
}

// ponytail: compara cada ventana de palabras contra cada nombre, O(palabras × nombres); sobra para frases cortas y ~100 nombres.
export function corregir(frase: string, nombres: string[]): string {
  const palabras = frase.split(/\s+/).filter(Boolean);
  const candidatos = nombres
    .map(nombre => ({ nombre, plano: plegar(nombre).replace(/ /g, ''), n: nombre.split(/\s+/).length }))
    .filter(c => c.plano.length >= 8) // los nombres cortos dan falsos positivos («Medias» en «media hora»)
    .sort((a, b) => b.plano.length - a.plano.length);
  const salida: string[] = [];
  let i = 0;
  while (i < palabras.length) {
    let tomadas = 0;
    for (const c of candidatos) {
      // Chirp a veces parte o une palabras: se prueba con una palabra de más y de menos.
      for (const n of [c.n, c.n + 1, c.n - 1]) {
        if (n < 1 || i + n > palabras.length) continue;
        const ventana = palabras.slice(i, i + n);
        if (distancia(plegar(ventana.join(' ')).replace(/ /g, ''), c.plano) <= Math.floor(c.plano.length / 6)) {
          salida.push(c.nombre + (ventana.at(-1)!.match(/[.,;:!?»]+$/)?.[0] ?? ''));
          tomadas = n;
          break;
        }
      }
      if (tomadas) break;
    }
    if (tomadas) i += tomadas;
    else salida.push(palabras[i++]);
  }
  return salida.join(' ');
}
