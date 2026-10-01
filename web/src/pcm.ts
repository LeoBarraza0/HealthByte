export function aInt16(f: Float32Array): Int16Array {
  const salida = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    salida[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return salida;
}

export function rms(f: Float32Array): number {
  let suma = 0;
  for (const x of f) suma += x * x;
  return f.length ? Math.sqrt(suma / f.length) : 0;
}

export function crearAcumulador(tamano: number): (entrada: Float32Array) => Float32Array[] {
  let bloque = new Float32Array(tamano);
  let n = 0;
  return entrada => {
    const listos: Float32Array[] = [];
    for (const x of entrada) {
      bloque[n++] = x;
      if (n === tamano) { listos.push(bloque); bloque = new Float32Array(tamano); n = 0; }
    }
    return listos;
  };
}

// ponytail: detector por volumen. Si el ruido del quirófano lo engaña, cambiar por un VAD entrenado (por ejemplo, Silero en WASM).
export function crearVad(o: { umbral: () => number; colgadoMs: number; previosBloques: number }) {
  const previos: Float32Array[] = [];
  let hasta = -Infinity;
  return {
    procesar(bloque: Float32Array, ahora: number): Float32Array[] {
      if (rms(bloque) >= o.umbral()) {
        hasta = ahora + o.colgadoMs;
        return [...previos.splice(0), bloque];
      }
      if (ahora <= hasta) return [bloque];
      previos.push(bloque);
      if (previos.length > o.previosBloques) previos.shift();
      return [];
    },
  };
}
