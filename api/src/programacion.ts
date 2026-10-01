import type { NuevaCirugia, NuevoIntegrante, Rol } from './tipos.ts';

export const ROLES: readonly Rol[] = [
  'cirujano',
  'anestesiologo',
  'instrumentador',
  'auxiliar_enfermeria',
  'perfusionista',
  'coordinador',
  'admin',
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:\d{2})?)?$/;

export function esFechaValida(fecha: unknown): fecha is string {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [y, m, d] = fecha.split('-').map(Number);
  const dt = new Date(`${fecha}T00:00:00Z`);
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d;
}

function validarTexto(valor: unknown, campo: string, max = 200): string | null {
  if (typeof valor !== 'string') return `${campo} debe ser texto`;
  const t = valor.trim();
  if (t.length === 0) return `${campo} no puede estar vacío`;
  if (t.length > max) return `${campo} no puede superar los ${max} caracteres`;
  return null;
}

export function validarNuevaCirugia(x: unknown): NuevaCirugia | string {
  if (!x || typeof x !== 'object' || Array.isArray(x)) {
    return 'Datos de cirugía requeridos';
  }
  const obj = x as Record<string, unknown>;

  if (typeof obj.quirofano_id !== 'string' || !UUID.test(obj.quirofano_id.trim())) {
    return 'Quirófano inválido';
  }
  if (typeof obj.protocolo_id !== 'string' || !UUID.test(obj.protocolo_id.trim())) {
    return 'Protocolo inválido';
  }

  if (typeof obj.fecha_programada !== 'string' || !ISO_FECHA_HORA.test(obj.fecha_programada.trim()) || isNaN(Date.parse(obj.fecha_programada.trim()))) {
    return 'Fecha programada inválida';
  }

  if (typeof obj.duracion_min !== 'number' || !Number.isInteger(obj.duracion_min) || obj.duracion_min < 15 || obj.duracion_min > 720) {
    return 'Duración debe ser un entero entre 15 y 720 minutos';
  }

  const errProc = validarTexto(obj.procedimiento, 'Procedimiento');
  if (errProc) return errProc;

  const errDiag = validarTexto(obj.diagnostico, 'Diagnóstico');
  if (errDiag) return errDiag;

  const errLat = validarTexto(obj.lateralidad, 'Lateralidad');
  if (errLat) return errLat;

  if (!obj.paciente || typeof obj.paciente !== 'object' || Array.isArray(obj.paciente)) {
    return 'Datos del paciente requeridos';
  }
  const p = obj.paciente as Record<string, unknown>;

  const errNom = validarTexto(p.nombre, 'Nombre del paciente');
  if (errNom) return errNom;

  const errTipoDoc = validarTexto(p.tipo_doc, 'Tipo de documento');
  if (errTipoDoc) return errTipoDoc;

  const errNumDoc = validarTexto(p.num_doc, 'Número de documento');
  if (errNumDoc) return errNumDoc;

  if (!esFechaValida(p.fecha_nacimiento)) {
    return 'Fecha de nacimiento inválida (formato YYYY-MM-DD)';
  }

  const errEps = validarTexto(p.eps, 'EPS');
  if (errEps) return errEps;

  const errHc = validarTexto(p.hc, 'Historia clínica');
  if (errHc) return errHc;

  if (!obj.equipo_programado || typeof obj.equipo_programado !== 'object' || Array.isArray(obj.equipo_programado)) {
    return 'Equipo programado inválido';
  }
  const equipo = obj.equipo_programado as Record<string, unknown>;
  const rolesValidos = new Set<string>(ROLES);
  const equipoLimpio: Partial<Record<Rol, string>> = {};

  for (const [rol, id] of Object.entries(equipo)) {
    if (!rolesValidos.has(rol)) {
      return `Rol '${rol}' inválido`;
    }
    if (typeof id !== 'string' || !UUID.test(id.trim())) {
      return `Identificador de usuario inválido para el rol '${rol}'`;
    }
    equipoLimpio[rol as Rol] = id.trim();
  }

  if (obj.datos_preop !== undefined && (typeof obj.datos_preop !== 'object' || obj.datos_preop === null || Array.isArray(obj.datos_preop))) {
    return 'Datos preoperatorios deben ser un objeto';
  }
  const datosPreop = (obj.datos_preop ?? {}) as Record<string, string | number | null>;

  return {
    quirofano_id: obj.quirofano_id.trim(),
    protocolo_id: obj.protocolo_id.trim(),
    fecha_programada: obj.fecha_programada.trim(),
    duracion_min: obj.duracion_min,
    paciente: {
      nombre: (p.nombre as string).trim(),
      tipo_doc: (p.tipo_doc as string).trim(),
      num_doc: (p.num_doc as string).trim(),
      fecha_nacimiento: (p.fecha_nacimiento as string).trim(),
      eps: (p.eps as string).trim(),
      hc: (p.hc as string).trim(),
    },
    procedimiento: (obj.procedimiento as string).trim(),
    diagnostico: (obj.diagnostico as string).trim(),
    lateralidad: (obj.lateralidad as string).trim(),
    equipo_programado: equipoLimpio,
    datos_preop: datosPreop,
  };
}

export function validarNuevoIntegrante(x: unknown): NuevoIntegrante | string {
  if (!x || typeof x !== 'object' || Array.isArray(x)) {
    return 'Datos de integrante requeridos';
  }
  const obj = x as Record<string, unknown>;

  const errNom = validarTexto(obj.nombre, 'Nombre');
  if (errNom) return errNom;

  const rolesValidos = new Set<string>(ROLES);
  if (typeof obj.rol !== 'string' || !rolesValidos.has(obj.rol)) {
    return 'Rol inválido';
  }

  const LOGIN_REGEX = /^[a-z0-9._-]{3,30}$/;
  if (typeof obj.login !== 'string' || !LOGIN_REGEX.test(obj.login.trim())) {
    return 'Login inválido (3-30 caracteres en minúsculas, números, puntos, guiones)';
  }

  if (typeof obj.clave !== 'string' || obj.clave.length < 8) {
    return 'La clave debe tener al menos 8 caracteres';
  }

  return {
    nombre: (obj.nombre as string).trim(),
    rol: obj.rol as Rol,
    login: (obj.login as string).trim(),
    clave: obj.clave,
  };
}
