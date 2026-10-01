import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from './app.ts';
import { COOKIE } from './auth.ts';
import { migrar, pool } from './db.ts';
import { CLAVE_DEMO, sembrar } from './siembra.ts';
import type { CirugiaAgenda, Integrante, ProtocoloResumen, Quirofano } from './tipos.ts';

const app = await crearApp();
before(async () => { await migrar(); await sembrar(); });
after(async () => { await app.close(); await pool.end(); });

async function entrar(clinica: string, usuario: string): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/api/login', payload: { clinica, usuario, clave: CLAVE_DEMO } });
  assert.equal(r.statusCode, 200);
  return r.cookies.find(c => c.name === COOKIE)!.value;
}

function hoyBogota(): string {
  const bogota = new Date(Date.now() - 5 * 3600 * 1000);
  return bogota.toISOString().slice(0, 10);
}

test('GET /api/quirofanos lista quirófanos ordenados por nombre', async () => {
  const cookie = await entrar('caribe', 'coordinador');
  const r = await app.inject({ url: '/api/quirofanos', cookies: { [COOKIE]: cookie } });
  assert.equal(r.statusCode, 200);
  const qx = r.json() as Quirofano[];
  assert.ok(qx.length >= 4);
  assert.equal(qx[0].nombre, 'QX 01');
  const nombres = qx.map(q => q.nombre);
  assert.deepEqual(nombres, [...nombres].sort());
});

test('GET /api/protocolos lista protocolos con campos_preop', async () => {
  const cookie = await entrar('caribe', 'coordinador');
  const r = await app.inject({ url: '/api/protocolos', cookies: { [COOKIE]: cookie } });
  assert.equal(r.statusCode, 200);
  const prot = r.json() as ProtocoloResumen[];
  assert.ok(prot.length >= 2);
  const cardio = prot.find(p => p.especialidad === 'Cardiovascular');
  assert.ok(cardio);
  assert.ok(Array.isArray(cardio.campos_preop));
  assert.ok(cardio.campos_preop.length > 0);
});

test('GET /api/agenda valida fecha y devuelve cirugías del día', async () => {
  const cookie = await entrar('caribe', 'coordinador');
  // Fecha inválida
  const rInvalida1 = await app.inject({ url: '/api/agenda?fecha=invalida', cookies: { [COOKIE]: cookie } });
  assert.equal(rInvalida1.statusCode, 400);

  const rInvalida2 = await app.inject({ url: '/api/agenda?fecha=2026-02-31', cookies: { [COOKIE]: cookie } });
  assert.equal(rInvalida2.statusCode, 400);

  const rSinFecha = await app.inject({ url: '/api/agenda', cookies: { [COOKIE]: cookie } });
  assert.equal(rSinFecha.statusCode, 400);

  // Fecha de hoy
  const hoy = hoyBogota();
  const r = await app.inject({ url: `/api/agenda?fecha=${hoy}`, cookies: { [COOKIE]: cookie } });
  assert.equal(r.statusCode, 200);
  const cirugias = r.json() as CirugiaAgenda[];
  assert.ok(cirugias.length >= 3);
  for (const c of cirugias) {
    assert.ok(c.id);
    assert.ok(c.quirofano_id);
    assert.ok(c.quirofano);
    assert.ok(c.fecha_programada.startsWith(hoy));
    assert.equal(typeof c.duracion_min, 'number');
    assert.ok(c.paciente);
    assert.ok(c.procedimiento);
    assert.ok(c.especialidad);
    assert.ok(['programada', 'en_curso', 'realizada'].includes(c.estado));
  }
});

test('GET /api/personal incluye login y cumple Integrante[]', async () => {
  const cookie = await entrar('caribe', 'coordinador');
  const r = await app.inject({ url: '/api/personal', cookies: { [COOKIE]: cookie } });
  assert.equal(r.statusCode, 200);
  const integrantes = r.json() as Integrante[];
  assert.ok(integrantes.length > 0);
  for (const i of integrantes) {
    assert.ok(i.id);
    assert.ok(i.nombre);
    assert.ok(i.rol);
    assert.ok(typeof i.login === 'string' && i.login.length > 0);
  }
  assert.ok(integrantes.some(i => i.login === 'coordinador'));
});

test('POST /api/cirugias permite a la coordinación programar cirugías y valida conflictos y roles', async () => {
  const coordCookie = await entrar('caribe', 'coordinador');
  const circulanteCookie = await entrar('caribe', 'circulante');

  // Obtener catálogos necesarios
  const qxList = (await app.inject({ url: '/api/quirofanos', cookies: { [COOKIE]: coordCookie } })).json() as Quirofano[];
  const protList = (await app.inject({ url: '/api/protocolos', cookies: { [COOKIE]: coordCookie } })).json() as ProtocoloResumen[];
  const persList = (await app.inject({ url: '/api/personal', cookies: { [COOKIE]: coordCookie } })).json() as Integrante[];
  const cirujano = persList.find(p => p.rol === 'cirujano')!;

  const hoy = hoyBogota();
  const quirofanoId = qxList[3].id;
  const protocoloId = protList[0].id;
  const fechaProgramada = `${hoy}T16:00:00-05:00`;

  const payload = {
    quirofano_id: quirofanoId,
    protocolo_id: protocoloId,
    fecha_programada: fechaProgramada,
    duracion_min: 120,
    paciente: {
      nombre: 'Paciente Test Caribe',
      tipo_doc: 'CC',
      num_doc: '99887766',
      fecha_nacimiento: '1990-01-01',
      eps: 'EPS Demo A',
      hc: 'HC-TEST-001',
    },
    procedimiento: 'Cirugía de Prueba',
    diagnostico: 'Diagnóstico de Prueba',
    lateralidad: 'No aplica',
    equipo_programado: {
      cirujano: cirujano.id,
    },
    datos_preop: { peso: 75 },
  };

  let cirugiaId: string | undefined;
  try {
    // Como circulante: 403
    const rCirculante = await app.inject({
      method: 'POST',
      url: '/api/cirugias',
      payload,
      cookies: { [COOKIE]: circulanteCookie },
    });
    assert.equal(rCirculante.statusCode, 403);
    assert.deepEqual(rCirculante.json(), { error: 'Solo coordinación' });

    // Como coordinador sin procedimiento: 400
    const rSinProc = await app.inject({
      method: 'POST',
      url: '/api/cirugias',
      payload: { ...payload, procedimiento: '   ' },
      cookies: { [COOKIE]: coordCookie },
    });
    assert.equal(rSinProc.statusCode, 400);

    // Como coordinador: 201
    const rCrear = await app.inject({
      method: 'POST',
      url: '/api/cirugias',
      payload,
      cookies: { [COOKIE]: coordCookie },
    });
    assert.equal(rCrear.statusCode, 201);
    const bodyCrear = rCrear.json() as { id: string };
    cirugiaId = bodyCrear.id;
    assert.ok(cirugiaId);

    // Aparece en /api/agenda?fecha=hoy
    const rAgenda = await app.inject({ url: `/api/agenda?fecha=${hoy}`, cookies: { [COOKIE]: coordCookie } });
    assert.equal(rAgenda.statusCode, 200);
    const agendaCirugias = rAgenda.json() as CirugiaAgenda[];
    const enAgenda = agendaCirugias.find(c => c.id === cirugiaId);
    assert.ok(enAgenda);
    assert.equal(enAgenda.procedimiento, 'Cirugía de Prueba');
    assert.equal(enAgenda.estado, 'programada');

    // Aparece en /api/cirugias
    const rCirugias = await app.inject({ url: '/api/cirugias', cookies: { [COOKIE]: coordCookie } });
    assert.equal(rCirugias.statusCode, 200);
    const activas = rCirugias.json() as { id: string; procedimiento: string }[];
    assert.ok(activas.some(c => c.id === cirugiaId));

    // /api/cirugias/:id la abre
    const rDetalle = await app.inject({ url: `/api/cirugias/${cirugiaId}`, cookies: { [COOKIE]: coordCookie } });
    assert.equal(rDetalle.statusCode, 200);
    const detalle = rDetalle.json() as { cirugia: { id: string; procedimiento: string } };
    assert.equal(detalle.cirugia.id, cirugiaId);
    assert.equal(detalle.cirugia.procedimiento, 'Cirugía de Prueba');

    // Segunda en el mismo quirófano y a la misma hora: 409
    const rConflicto = await app.inject({
      method: 'POST',
      url: '/api/cirugias',
      payload: {
        ...payload,
        paciente: { ...payload.paciente, num_doc: '99887767', hc: 'HC-TEST-002' },
      },
      cookies: { [COOKIE]: coordCookie },
    });
    assert.equal(rConflicto.statusCode, 409);
    assert.deepEqual(rConflicto.json(), { error: 'El quirófano ya está ocupado a esa hora' });

    // Como norte / coordinador: la agenda de hoy NO trae la cirugía creada en caribe
    const norteCoordCookie = await entrar('norte', 'coordinador');
    const rAgendaNorte = await app.inject({ url: `/api/agenda?fecha=${hoy}`, cookies: { [COOKIE]: norteCoordCookie } });
    assert.equal(rAgendaNorte.statusCode, 200);
    const agendaNorte = rAgendaNorte.json() as CirugiaAgenda[];
    assert.ok(!agendaNorte.some(c => c.id === cirugiaId));
  } finally {
    if (cirugiaId) {
      await pool.query('DELETE FROM cirugia WHERE id = $1', [cirugiaId]);
    }
    await pool.query("DELETE FROM paciente WHERE hc LIKE 'HC-TEST-%'");
  }
});

test('POST /api/personal crea un integrante, valida roles, login único y permite login', async () => {
  const coordCookie = await entrar('caribe', 'coordinador');
  const circulanteCookie = await entrar('caribe', 'circulante');

  const nuevoUsuario = {
    nombre: 'Laura Enfermera',
    rol: 'auxiliar_enfermeria',
    login: 'laura.enfermera',
    clave: 'claveSegura2026',
  };

  // Como circulante: 403
  const rCirculante = await app.inject({
    method: 'POST',
    url: '/api/personal',
    payload: nuevoUsuario,
    cookies: { [COOKIE]: circulanteCookie },
  });
  assert.equal(rCirculante.statusCode, 403);
  assert.deepEqual(rCirculante.json(), { error: 'Solo coordinación' });

  let nuevoId: string | undefined;
  try {
    // Crea un integrante
    const rCrear = await app.inject({
      method: 'POST',
      url: '/api/personal',
      payload: nuevoUsuario,
      cookies: { [COOKIE]: coordCookie },
    });
    assert.equal(rCrear.statusCode, 201);
    const bodyCrear = rCrear.json() as { id: string };
    nuevoId = bodyCrear.id;
    assert.ok(nuevoId);

    // Entra con su login y su clave -> 200
    const rLogin = await app.inject({
      method: 'POST',
      url: '/api/login',
      payload: { clinica: 'caribe', usuario: nuevoUsuario.login, clave: nuevoUsuario.clave },
    });
    assert.equal(rLogin.statusCode, 200);
    const sesion = rLogin.json() as { nombre: string; rol: string };
    assert.equal(sesion.nombre, 'Laura Enfermera');
    assert.equal(sesion.rol, 'auxiliar_enfermeria');

    // El mismo login otra vez -> 409
    const rDuplicado = await app.inject({
      method: 'POST',
      url: '/api/personal',
      payload: nuevoUsuario,
      cookies: { [COOKIE]: coordCookie },
    });
    assert.equal(rDuplicado.statusCode, 409);
    assert.deepEqual(rDuplicado.json(), { error: 'Ese usuario ya existe' });
  } finally {
    if (nuevoId) {
      await pool.query('DELETE FROM usuario WHERE id = $1', [nuevoId]);
    }
  }
});

