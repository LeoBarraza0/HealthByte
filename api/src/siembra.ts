import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { pool } from './db.ts';
import { hashClave } from './clave.ts';
import { INSUMOS } from './insumos.ts';
import { INSTRUMENTOS } from './instrumentos.ts';
import { PROTOCOLO_CARDIO, PROTOCOLO_GENERAL, conMarcacion } from './protocolos.ts';
import type { DatosEvento, Fase, Persona, Protocolo, Rol } from './tipos.ts';

// Credencial de prueba de la demo. Todos los usuarios sembrados la comparten; los datos son ficticios.
export const CLAVE_DEMO = 'demo2026';

const CLINICAS = [
  { slug: 'caribe', nombre: 'Clínica Demo Caribe', protocolos: [PROTOCOLO_CARDIO, PROTOCOLO_GENERAL] },
  { slug: 'norte', nombre: 'IPS Demo Norte', protocolos: [PROTOCOLO_CARDIO, conMarcacion(PROTOCOLO_GENERAL)] },
];
const PLANTA: [Rol, number][] = [
  ['cirujano', 3], ['anestesiologo', 2], ['instrumentador', 2], ['auxiliar_enfermeria', 2], ['perfusionista', 1], ['coordinador', 1],
];
const EQUIPO_BASE: Rol[] = ['cirujano', 'anestesiologo', 'instrumentador', 'auxiliar_enfermeria'];
const NOMBRES = ['Ana', 'Carlos', 'Luisa', 'Jorge', 'María', 'Andrés', 'Paola', 'Diego', 'Valentina', 'Camilo', 'Daniela', 'Javier', 'Sofía', 'Ricardo', 'Laura', 'Mateo'];
const APELLIDOS = ['Pérez', 'Gómez', 'Rodríguez', 'Martínez', 'Díaz', 'Herrera', 'Castro', 'Ruiz', 'Vargas', 'Rojas', 'Mendoza', 'Ortiz', 'Navarro', 'Silva'];
const EPS = ['EPS Demo A', 'EPS Demo B', 'EPS Demo C'];
const PROCEDIMIENTOS: Record<string, [string, string, string][]> = {
  'Cardiovascular': [
    ['Revascularización miocárdica', 'Enfermedad coronaria multivaso', 'No aplica'],
    ['Cambio valvular aórtico', 'Estenosis aórtica severa', 'No aplica'],
  ],
  'Cirugía general': [
    ['Colecistectomía laparoscópica', 'Colelitiasis', 'No aplica'],
    ['Herniorrafia inguinal', 'Hernia inguinal', 'Derecha'],
    ['Apendicectomía', 'Apendicitis aguda', 'No aplica'],
  ],
};
const NOVEDADES = ['Falla del aspirador', 'Electrobisturí sin señal', 'Retraso en la llegada de hemoderivados', 'Monitor con artefacto en la señal'];
const DATOS_COMPLETOS = {
  peso: 72, talla: 168, alergias: 'Niega', grupo_sanguineo: 'O', rh: '+', reserva_sangre: '2 unidades',
  tipo_anestesia: 'General', comorbilidades: 'HTA', condiciones_especiales: '', aislamiento: 'No', glucometria: 110,
};
const CASOS_DEL_DIA = [
  { especialidad: 'Cardiovascular', procedimiento: PROCEDIMIENTOS['Cardiovascular'][0], hora: 7,
    datos: { ...DATOS_COMPLETOS, alergias: 'Penicilina', glucometria: null, reserva_sangre: '' } },
  { especialidad: 'Cirugía general', procedimiento: PROCEDIMIENTOS['Cirugía general'][0], hora: 9.5, datos: DATOS_COMPLETOS },
  { especialidad: 'Cirugía general', procedimiento: PROCEDIMIENTOS['Cirugía general'][1], hora: 13, datos: DATOS_COMPLETOS },
];
const HORA = 3_600_000;
const MINUTO = 60_000;

function prng(semilla: number): () => number {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function elegir<T>(r: () => number, xs: readonly T[]): T {
  return xs[Math.floor(r() * xs.length)];
}

/** Medianoche de Bogotá (UTC−5) de hace `diasAtras` días, en milisegundos. */
function inicioDelDia(diasAtras = 0): number {
  const bogota = new Date(Date.now() - 5 * HORA);
  return Date.UTC(bogota.getUTCFullYear(), bogota.getUTCMonth(), bogota.getUTCDate() - diasAtras) + 5 * HORA;
}

async function enTransaccion(fn: (c: pg.PoolClient) => Promise<void>): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await fn(c);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

// También actualiza las clínicas de bases que ya estaban sembradas.
async function sembrarInsumos(): Promise<void> {
  await pool.query(`
    INSERT INTO insumo (clinica_id, nombre, categoria)
    SELECT c.id, i.nombre, i.categoria FROM clinica c, jsonb_to_recordset($1::jsonb) AS i(nombre text, categoria text)
    ON CONFLICT (clinica_id, nombre) DO NOTHING`, [JSON.stringify(INSUMOS)]);
}

async function sembrarInstrumentos(): Promise<void> {
  await pool.query(`
    INSERT INTO instrumento (clinica_id, codigo, nombre, categoria)
    SELECT c.id, i.codigo, i.nombre, i.categoria FROM clinica c,
      jsonb_to_recordset($1::jsonb) AS i(codigo text, nombre text, categoria text)
    ON CONFLICT (clinica_id, codigo) DO NOTHING`, [JSON.stringify(INSTRUMENTOS)]);
}

export async function sembrar(): Promise<void> {
  const { rowCount } = await pool.query("SELECT 1 FROM clinica WHERE slug = 'caribe'");
  if (rowCount) {
    await sembrarInsumos();
    return sembrarInstrumentos();
  }
  const r = prng(2026);
  const hash = hashClave(CLAVE_DEMO);
  for (const def of CLINICAS) await enTransaccion(c => sembrarClinica(c, def, hash, r));
  await sembrarInsumos();
  await sembrarInstrumentos();
}

/** Archiva las cirugías sin terminar y vuelve a programar las del día. Corre como dueño de las tablas. */
export async function reiniciarDemo(): Promise<void> {
  await enTransaccion(async c => {
    await c.query(`UPDATE cirugia c SET archivada = true WHERE NOT archivada AND NOT EXISTS (
      SELECT 1 FROM evento e WHERE e.cirugia_id = c.id AND e.tipo = 'hora' AND e.datos->>'hora' = 'salida_recuperacion')`);
    const { rows } = await c.query("SELECT id FROM clinica WHERE slug IN ('caribe', 'norte')");
    for (const { id } of rows) await programarDelDia(c, id);
  });
}

async function sembrarClinica(c: pg.PoolClient, def: (typeof CLINICAS)[number], hash: string, r: () => number): Promise<void> {
  const id = async (sql: string, p: unknown[]) => (await c.query(sql, p)).rows[0].id as string;
  const clinicaId = await id('INSERT INTO clinica (slug, nombre) VALUES ($1, $2) RETURNING id', [def.slug, def.nombre]);

  const personal = new Map<Rol, Persona[]>();
  for (const [rol, cuantos] of PLANTA) for (let i = 1; i <= cuantos; i++) {
    const nombre = `${elegir(r, NOMBRES)} ${elegir(r, APELLIDOS)}`;
    const login = rol === 'auxiliar_enfermeria' && i === 1 ? 'circulante' : rol === 'coordinador' ? 'coordinador' : `${rol}${i}`;
    const uid = await id('INSERT INTO usuario (clinica_id, nombre, rol, login, hash_clave) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [clinicaId, nombre, rol, login, hash]);
    personal.set(rol, [...(personal.get(rol) ?? []), { id: uid, nombre }]);
  }

  const quirofanos: string[] = [];
  for (let i = 1; i <= 4; i++) quirofanos.push(await id('INSERT INTO quirofano (clinica_id, nombre) VALUES ($1, $2) RETURNING id', [clinicaId, `QX 0${i}`]));

  const protocolos = new Map<string, { id: string; p: Protocolo }>();
  for (const p of def.protocolos) {
    protocolos.set(p.especialidad, {
      id: await id('INSERT INTO protocolo (clinica_id, especialidad, definicion) VALUES ($1, $2, $3) RETURNING id', [clinicaId, p.especialidad, p]),
      p,
    });
  }

  const pacientes: string[] = [];
  for (let i = 1; i <= 40; i++) {
    const nacimiento = new Date(Date.UTC(1940 + Math.floor(r() * 66), Math.floor(r() * 12), 1 + Math.floor(r() * 28)));
    pacientes.push(await id(
      'INSERT INTO paciente (clinica_id, nombre, tipo_doc, num_doc, fecha_nacimiento, eps, hc) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [clinicaId, `${elegir(r, NOMBRES)} ${elegir(r, APELLIDOS)} ${elegir(r, APELLIDOS)}`, 'CC',
        String(10_000_000 + Math.floor(r() * 89_999_999)), nacimiento.toISOString().slice(0, 10), elegir(r, EPS),
        `HC-${def.slug}-${String(i).padStart(4, '0')}`]));
  }

  const circulante = personal.get('auxiliar_enfermeria')![0].id;
  for (let dia = 30; dia >= 1; dia--) for (const hora of [7, 11]) {
    const especialidad = r() < 0.35 ? 'Cardiovascular' : 'Cirugía general';
    const { id: protocoloId, p } = protocolos.get(especialidad)!;
    const [procedimiento, diagnostico, lateralidad] = elegir(r, PROCEDIMIENTOS[especialidad]);
    const roles: Rol[] = especialidad === 'Cardiovascular' ? [...EQUIPO_BASE, 'perfusionista'] : EQUIPO_BASE;
    const equipo = Object.fromEntries(roles.map(rol => [rol, elegir(r, personal.get(rol)!)]));
    const fecha = inicioDelDia(dia) + hora * HORA;
    const cirugiaId = await id(`INSERT INTO cirugia (clinica_id, quirofano_id, paciente_id, protocolo_id, fecha_programada,
        procedimiento, diagnostico, lateralidad, equipo_programado, datos_preop)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [clinicaId, elegir(r, quirofanos), elegir(r, pacientes), protocoloId, new Date(fecha).toISOString(),
        procedimiento, diagnostico, lateralidad, equipo, { ...DATOS_COMPLETOS, alergias: r() < 0.2 ? 'Penicilina' : 'Niega' }]);
    await c.query(`INSERT INTO evento (id, clinica_id, cirugia_id, ts, tipo, datos, registrado_por, rol_confirma, origen)
        SELECT x.id, $1, $2, x.ts, x.datos->>'tipo', x.datos, $3, x.rol, x.origen
        FROM jsonb_to_recordset($4::jsonb) AS x(id uuid, ts timestamptz, datos jsonb, rol text, origen text)`,
      [clinicaId, cirugiaId, circulante, JSON.stringify(generarEventos(p, equipo, fecha + 10 * MINUTO, r))]);
  }

  await programarDelDia(c, clinicaId);
}

async function programarDelDia(c: pg.PoolClient, clinicaId: string): Promise<void> {
  const filas = async (sql: string) => (await c.query(sql, [clinicaId])).rows;
  const usuarios = await filas('SELECT id, nombre, rol FROM usuario WHERE clinica_id = $1 ORDER BY login');
  const quirofanos = await filas('SELECT id FROM quirofano WHERE clinica_id = $1 ORDER BY nombre');
  const protocolos = await filas('SELECT id, especialidad FROM protocolo WHERE clinica_id = $1');
  const pacientes = await filas('SELECT id FROM paciente WHERE clinica_id = $1 ORDER BY hc LIMIT 3');
  for (const [i, caso] of CASOS_DEL_DIA.entries()) {
    const roles: Rol[] = caso.especialidad === 'Cardiovascular' ? [...EQUIPO_BASE, 'perfusionista'] : EQUIPO_BASE;
    const equipo = Object.fromEntries(roles.map(rol => {
      const u = usuarios.find(x => x.rol === rol);
      return [rol, { id: u.id, nombre: u.nombre }];
    }));
    const protocolo = protocolos.find(p => p.especialidad === caso.especialidad);
    await c.query(`INSERT INTO cirugia (clinica_id, quirofano_id, paciente_id, protocolo_id, fecha_programada,
        procedimiento, diagnostico, lateralidad, equipo_programado, datos_preop)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [clinicaId, quirofanos[i].id, pacientes[i].id, protocolo.id, new Date(inicioDelDia() + caso.hora * HORA).toISOString(),
        ...caso.procedimiento, equipo, caso.datos]);
  }
}

interface FilaEvento { id: string; ts: string; datos: DatosEvento; rol: Rol | null; origen: 'voz' | 'manual' }

/** Una cirugía plausible: casi siempre cumple el protocolo, a veces deja algo que el panel debe mostrar. */
function generarEventos(p: Protocolo, equipo: Record<string, Persona>, inicio: number, r: () => number): FilaEvento[] {
  const filas: FilaEvento[] = [];
  let t = inicio;
  const add = (datos: DatosEvento, minutos = 1, rol: Rol | null = null, id: string = randomUUID()) => {
    t += minutos * MINUTO;
    filas.push({ id, ts: new Date(t).toISOString(), datos, rol, origen: r() < 0.75 ? 'voz' : 'manual' });
  };
  const verificar = (f: Fase, omitir?: string) => {
    for (const i of f.items) if (i.id !== omitir) add({ tipo: 'check', fase: f.id, item: i.id, valor: 'si' }, 1, i.rol);
  };
  const [f1, f2, f3] = p.fases;
  const cardio = p.hitos.includes('Entrada a bomba');

  add({ tipo: 'hora', hora: 'ingreso' }, 0);
  for (const [rol, u] of Object.entries(equipo)) add({ tipo: 'presente', usuario_id: u.id, rol: rol as Rol }, 0);
  verificar(f1);
  add({ tipo: 'hora', hora: 'anestesia' }, 4 + r() * 10);
  const sinAntibiotico = r() < 0.06;
  verificar(f2, sinAntibiotico ? 'antibiotico' : undefined);
  if (sinAntibiotico) {
    add({ tipo: 'alerta_cierre', alerta: 'critico:antes_incision.antibiotico', motivo: 'Antibiótico administrado en hospitalización' });
  }
  add({ tipo: 'hora', hora: 'inicio_cirugia' }, 10 + r() * 20);
  const inicioCirugia = t;
  for (const [material, n] of [['Compresas', 10], ['Gasas', 10], ['Agujas Sutura', 6]] as const) {
    add({ tipo: 'conteo', material, cantidad: n }, 0);
  }
  if (cardio) {
    add({ tipo: 'hito', hito: 'Heparina' }, 20);
    add({ tipo: 'hito', hito: 'Entrada a bomba' }, 10);
    add({ tipo: 'hito', hito: 'Clamp aórtico' }, 5);
    add({ tipo: 'hito', hito: 'Cardioplejía' }, 2);
    add({ tipo: 'hito', hito: 'Retiro de clamp' }, 50 + r() * 40);
    add({ tipo: 'hito', hito: 'Salida de bomba' }, 15 + r() * 15);
  }
  if (r() < 0.15) {
    const novedad = randomUUID();
    add({ tipo: 'novedad', texto: elegir(r, NOVEDADES) }, 15, null, novedad);
    add({ tipo: 'novedad_atendida', novedad_id: novedad, responsable: 'Auxiliar de enfermería' }, 2 + r() * 4);
    add({ tipo: 'novedad_solucionada', novedad_id: novedad, acciones: 'Se reemplazó el equipo' }, 3 + r() * 12);
  }
  add({ tipo: 'hora', hora: 'fin_cirugia' }, (cardio ? 40 : 30) + r() * 60);
  const finCirugia = t;
  const descuadre = r() < 0.05;
  add({ tipo: 'conteo', material: 'Compresas', cantidad: descuadre ? -9 : -10 }, 2);
  add({ tipo: 'conteo', material: 'Gasas', cantidad: -10 });
  add({ tipo: 'conteo', material: 'Agujas Sutura', cantidad: -6 });
  if (descuadre) add({ tipo: 'conteo', material: 'Compresas', cantidad: -1 }, 4);
  verificar(f3, r() < 0.08 ? 'muestras' : undefined);
  add({ tipo: 'hora', hora: 'salida_recuperacion' }, 8 + r() * 15);
  const consumos = 3 + Math.floor(r() * 4);
  for (let i = 0; i < consumos; i++) {
    filas.push({
      id: randomUUID(), ts: new Date(inicioCirugia + r() * (finCirugia - inicioCirugia)).toISOString(),
      datos: { tipo: 'consumo', insumo: elegir(r, INSUMOS).nombre, cantidad: 1 + Math.floor(r() * 8) },
      rol: null, origen: 'manual',
    });
  }
  return filas;
}
