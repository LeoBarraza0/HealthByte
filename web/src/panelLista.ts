import type { Panel } from '../../api/src/tipos.ts';

export type CirugiaFila = Panel['lista'][number];

export interface FiltrosPanel {
  texto?: string;
  quirofano?: string;
  especialidad?: string;
  protocolo?: string;
  sinResolver?: boolean;
}

const limpiar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/** Filtra la lista de cirugías según los criterios seleccionados en el panel. */
export function filtrar(lista: CirugiaFila[], filtros: FiltrosPanel): CirugiaFila[] {
  let resultado = lista;

  if (filtros.texto) {
    const t = limpiar(filtros.texto);
    if (t) {
      resultado = resultado.filter(c =>
        limpiar(c.paciente).includes(t) ||
        limpiar(c.procedimiento).includes(t) ||
        limpiar(c.quirofano).includes(t) ||
        limpiar(c.especialidad).includes(t)
      );
    }
  }

  if (filtros.quirofano && filtros.quirofano.toLowerCase() !== 'todos') {
    const q = filtros.quirofano.trim().toLowerCase();
    resultado = resultado.filter(c => c.quirofano.trim().toLowerCase() === q);
  }

  if (filtros.especialidad && filtros.especialidad.toLowerCase() !== 'todas') {
    const esp = filtros.especialidad.trim().toLowerCase();
    resultado = resultado.filter(c => c.especialidad.trim().toLowerCase() === esp);
  }

  if (filtros.protocolo && filtros.protocolo.toLowerCase() !== 'todos') {
    const p = filtros.protocolo.toLowerCase();
    if (p === 'cumplido') {
      resultado = resultado.filter(c => c.protocolo_cumplido);
    } else if (p === 'incompleto') {
      resultado = resultado.filter(c => !c.protocolo_cumplido);
    }
  }

  if (filtros.sinResolver) {
    resultado = resultado.filter(c => c.alertas_abiertas > 0 || c.alertas_cerradas > 0);
  }

  return resultado;
}

/** Obtiene una subsección de la lista para la paginación actual. */
export function paginar<T>(lista: T[], pagina: number, porPagina: number): T[] {
  const p = Math.max(1, Math.floor(pagina));
  const n = Math.max(1, Math.floor(porPagina));
  const inicio = (p - 1) * n;
  return lista.slice(inicio, inicio + n);
}

/** Extrae las opciones únicas de quirófano y especialidad presentes en la lista. */
export function opciones(lista: CirugiaFila[]): { quirofanos: string[]; especialidades: string[] } {
  const quirofanos = [...new Set(lista.map(c => c.quirofano))].sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10);
    const nb = parseInt(b.replace(/\D/g, ''), 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b, 'es');
  });

  const especialidades = [...new Set(lista.map(c => c.especialidad))].sort((a, b) =>
    a.localeCompare(b, 'es')
  );

  return { quirofanos, especialidades };
}

/** Genera la matriz de datos lista para exportar a CSV con la función csv(). */
export function filasCsv(lista: CirugiaFila[]): (string | number)[][] {
  const encabezado = [
    'Fecha',
    'Quirófano',
    'Cirugía',
    'Paciente',
    'Especialidad',
    'Estado',
    'Protocolo',
    'Alertas',
    'Duración (min)',
  ];

  const filas = lista.map(c => {
    const fecha = new Date(c.fecha).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const protocolo = c.protocolo_cumplido ? 'Cumplido' : 'Incompleto';
    const partesAlertas: string[] = [];
    if (c.alertas_resueltas > 0) partesAlertas.push(`${c.alertas_resueltas} resueltas`);
    if (c.alertas_abiertas > 0) partesAlertas.push(`${c.alertas_abiertas} abiertas`);
    if (c.alertas_cerradas > 0) partesAlertas.push(`${c.alertas_cerradas} cerradas con motivo`);
    const alertas = partesAlertas.length ? partesAlertas.join(', ') : 'Ninguna';
    const duracion = c.minutos !== null ? c.minutos : '—';
    const estado = c.estado === 'realizada' ? 'Realizada' : c.estado === 'en_curso' ? 'En curso' : 'Programada';

    return [
      fecha,
      c.quirofano,
      c.procedimiento,
      c.paciente,
      c.especialidad,
      estado,
      protocolo,
      alertas,
      duracion,
    ];
  });

  return [encabezado, ...filas];
}
