import { randomBytes, randomInt } from 'node:crypto';
import type { DatosEvento, EstadoCirugia, LecturaIndicador, ModoCamara, ResultadoVision } from './tipos.ts';

// Sin 0/O ni 1/I/L para escribirlo sin confusiones. 31^8 ≈ 8,5 × 10^11 códigos: uno de 5 minutos y un solo uso no se adivina.
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const VIDA_CODIGO = 5 * 60_000;
const VIDA_VINCULO = 12 * 3_600_000; // más que la cirugía más larga; luego se escanea otro código

interface Destino { clinicaId: string; cirugiaId: string; expira: number }

const normalizarCodigo = (s: string) => s.toUpperCase().replace(/[^0-9A-Z]/g, '');

/** Códigos que muestra la tablet y vínculos con los que el celular se reconecta. Viven en memoria, igual que las salas. */
export function crearVinculos(ahora: () => number = Date.now) {
  const codigos = new Map<string, Destino>();
  const vinculos = new Map<string, Destino>();
  const vigente = (m: Map<string, Destino>, k: string): Destino | null => {
    const d = m.get(k);
    if (d && d.expira >= ahora()) return d;
    m.delete(k);
    return null;
  };
  const podar = (m: Map<string, Destino>) => { for (const [k, d] of m) if (d.expira < ahora()) m.delete(k); };

  return {
    emitir(clinicaId: string, cirugiaId: string): { codigo: string; expira: number } {
      podar(codigos);
      let codigo: string;
      do codigo = Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
      while (codigos.has(codigo));
      const expira = ahora() + VIDA_CODIGO;
      codigos.set(codigo, { clinicaId, cirugiaId, expira });
      return { codigo, expira };
    },
    canjear(escrito: string): { vinculo: string; clinicaId: string; cirugiaId: string } | null {
      const codigo = normalizarCodigo(escrito);
      const d = vigente(codigos, codigo);
      if (!d) return null;
      codigos.delete(codigo);
      podar(vinculos);
      const vinculo = randomBytes(24).toString('base64url');
      vinculos.set(vinculo, { clinicaId: d.clinicaId, cirugiaId: d.cirugiaId, expira: ahora() + VIDA_VINCULO });
      return { vinculo, clinicaId: d.clinicaId, cirugiaId: d.cirugiaId };
    },
    validar(vinculo: string): { clinicaId: string; cirugiaId: string } | null {
      const d = vigente(vinculos, vinculo);
      return d && { clinicaId: d.clinicaId, cirugiaId: d.cirugiaId };
    },
    revocar(cirugiaId: string): void {
      for (const [k, d] of vinculos) if (d.cirugiaId === cirugiaId) vinculos.delete(k);
    },
  };
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const ESTERILIZACION = /\b(indicador|esteriliz\w*|cinta|integrador|testigo)\b/;
const CONTEO = /\b(cuenta|cuente|contar|conteo|contemos|revisa|revise|mira|mire)\b/;

/** «Cámara, cuenta la mesa» o «cámara, lee el indicador». Expresión regular y no Jev: es una orden fija y así no mueve los umbrales calibrados. */
export function ordenDeCamara(frase: string): ModoCamara | null {
  const f = sinTildes(frase);
  if (!/\bcamara\b/.test(f)) return null;
  if (ESTERILIZACION.test(f)) return 'esterilizacion';
  return CONTEO.test(f) ? 'conteo' : null;
}

/**
 * Lo que falta registrar según la cámara. Antes de la incisión todo el material está en la mesa: lo que ve entra.
 * Al cierre todo vuelve a la mesa: lo que ve sale, solo de lo que entró al campo. Durante la cirugía parte del
 * material está en el campo y la foto no dice cuánto entró, así que no propone nada.
 */
export function propuestaDeConteo(s: EstadoCirugia, visto: Record<string, number>): DatosEvento[] {
  if (s.horas.inicio_cirugia && !s.horas.fin_cirugia) return [];
  const salida = Boolean(s.horas.fin_cirugia);
  return s.protocolo.materiales.flatMap((material): DatosEvento[] => {
    const c = s.conteo[material] ?? { entra: 0, sale: 0 };
    const diferencia = (visto[material] ?? 0) - (salida ? c.sale : c.entra);
    if (diferencia <= 0 || (salida && c.entra === 0)) return [];
    return [{ tipo: 'conteo', material, cantidad: salida ? -diferencia : diferencia }];
  });
}

/** El ítem «Indicadores de esterilización del instrumental» con lo que leyó la cámara, si cambia algo. */
export function propuestaDeIndicador(s: EstadoCirugia, l: LecturaIndicador | null): DatosEvento[] {
  const fase = s.protocolo.fases.find(f => f.items.some(i => i.id === 'esterilizacion'));
  if (!fase || !l || l.estado === 'no_visible') return [];
  const valor = l.estado === 'viro' ? 'si' : 'no';
  if (s.checks[`${fase.id}.esterilizacion`]?.valor === valor) return [];
  return [{ tipo: 'check', fase: fase.id, item: 'esterilizacion', valor }];
}

const INDICADOR = { viro: 'viró', no_viro: 'no viró', no_visible: 'no se ve' } as const;

/** Lo que vio la cámara en una línea. Va en el texto de los eventos que se registran con la foto. */
export function resumenVisto(modo: ModoCamara, r: ResultadoVision): string {
  if (modo === 'esterilizacion') {
    const i = r.indicador;
    return `Cámara: indicador ${INDICADOR[i?.estado ?? 'no_visible']}${i?.lote ? `, lote ${i.lote}` : ''}`;
  }
  const partes = Object.entries(r.conteo).map(([m, n]) => `${m} ${n}`);
  return `Cámara: ${partes.join(', ') || 'sin material a la vista'}`;
}

/** Por qué no hay nada que confirmar después de una foto. */
export function avisoSinPropuesta(s: EstadoCirugia, modo: ModoCamara, r: ResultadoVision): string {
  if (modo === 'esterilizacion') {
    return !r.indicador || r.indicador.estado === 'no_visible'
      ? 'La cámara no ve el indicador con claridad. Acérquelo y repita.'
      : 'El indicador de esterilización ya está registrado así.';
  }
  if (!r.detecciones.length) return 'La cámara no encontró material en la mesa. Revise el encuadre.';
  if (s.horas.inicio_cirugia && !s.horas.fin_cirugia) return 'Durante la cirugía la cámara solo informa: registre las entradas por voz o a mano.';
  // Lo que debería estar en la mesa es lo que entró, antes de la incisión y al cierre.
  const distintos = s.protocolo.materiales.filter(m => (r.conteo[m] ?? 0) !== (s.conteo[m]?.entra ?? 0));
  return distintos.length
    ? `La cámara no coincide en ${distintos.join(', ').toLowerCase()}: revise la tabla.`
    : 'La cámara coincide con lo registrado.';
}
