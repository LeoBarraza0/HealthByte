import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as esperar } from 'node:timers/promises';
import { crearApp } from './app.ts';
import { COOKIE } from './auth.ts';
import { conClinica, migrar, pool } from './db.ts';
import { CLAVE_DEMO, sembrar } from './siembra.ts';
import type { Captura, EstadoCirugia, Evento, Panel } from './tipos.ts';

let visto: Record<string, number> = {};
const app = await crearApp({
  analizar: async () => ({
    conteo: visto, indicador: null, nota: null,
    detecciones: Object.entries(visto).map(([material, cantidad]) => ({ material, cantidad, caja: [100, 100, 300, 300] })),
  }),
});
before(async () => { await migrar(); await sembrar(); });
after(async () => { await app.close(); await pool.end(); });

async function entrar(clinica: string): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/api/login', payload: { clinica, usuario: 'circulante', clave: CLAVE_DEMO } });
  assert.equal(r.statusCode, 200);
  return r.cookies.find(c => c.name === COOKIE)!.value;
}

/** Un WebSocket de prueba que guarda lo que recibe y espera a que llegue lo que se busca. */
async function conectar(url: string, cookie?: string) {
  const ws = await app.injectWS(url, cookie ? { headers: { cookie: `${COOKIE}=${encodeURIComponent(cookie)}` } } : {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textos: any[] = [];
  const binarios: Buffer[] = [];
  let cierre: number | null = null;
  ws.on('message', (d: Buffer, binario: boolean) => { if (binario) binarios.push(d); else textos.push(JSON.parse(String(d))); });
  ws.on('close', (codigo: number) => { cierre = codigo; });
  async function hasta<T>(f: () => T | undefined | null | false): Promise<T> {
    for (let i = 0; i < 300; i++) {
      const r = f();
      if (r) return r;
      await esperar(10);
    }
    throw new Error(`No llegó lo esperado en ${url}`);
  }
  return {
    ws, textos, binarios,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mensaje: (p: (m: any) => boolean) => hasta(() => textos.findLast(p)),
    cierre: () => hasta(() => cierre),
  };
}

test('el celular se vincula, la foto se guarda con su imagen y el conteo confirmado queda con origen cámara', async () => {
  const cookie = await entrar('caribe');
  const cookies = { [COOKIE]: cookie };
  const panel = (await app.inject({ url: '/api/panel?dias=30', cookies })).json() as Panel;
  const id = panel.lista.find(x => x.estado === 'realizada')!.id;
  const estado = (await app.inject({ url: `/api/cirugias/${id}`, cookies })).json() as EstadoCirugia;
  const [material, conteo] = Object.entries(estado.conteo).find(([, c]) => c.entra > 0)!;
  visto = { [material]: conteo.sale + 1 }; // al cierre, una unidad más de la que se registró como salida

  const tablet = await conectar('/api/ws', cookie);
  tablet.ws.send(JSON.stringify({ tipo: 'unirse', cirugia_id: id, dispositivo: 'Tablet' }));
  await tablet.mensaje(m => m.tipo === 'estado');
  tablet.ws.send(JSON.stringify({ tipo: 'camara_codigo' }));
  const { codigo } = await tablet.mensaje(m => m.tipo === 'camara_codigo');

  const cel = await conectar('/api/camara/ws');
  cel.ws.send(JSON.stringify({ tipo: 'vincular', codigo, dispositivo: 'Celular prueba' }));
  const vinculada = await cel.mensaje(m => m.tipo === 'vinculada');
  assert.match(vinculada.quirofano, /^QX/);
  assert.equal(typeof vinculada.vinculo, 'string');
  await tablet.mensaje(m => m.tipo === 'estado' && m.camara.conectada?.dispositivo === 'Celular prueba');

  tablet.ws.send(JSON.stringify({ tipo: 'camara_ver', ver: true }));
  await cel.mensaje(m => m.tipo === 'viendo' && m.n === 1);
  cel.ws.send(Buffer.from([0, 0xff, 0xd8, 0xff, 7]));
  await tablet.mensaje(() => tablet.binarios.length > 0);
  assert.deepEqual([...tablet.binarios[0]], [0xff, 0xd8, 0xff, 7]);

  const camaraAntes = estado.eventos.filter(e => e.origen === 'camara').length;
  tablet.ws.send(JSON.stringify({ tipo: 'camara_contar', modo: 'conteo' }));
  await cel.mensaje(m => m.tipo === 'foto');
  const foto = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
  cel.ws.send(Buffer.concat([Buffer.from([1]), foto]));
  const pregunta = await tablet.mensaje(m => m.tipo === 'estado' && m.pendiente?.origen === 'camara');
  assert.equal(pregunta.pendiente.resumen, `${material} -1`);
  tablet.ws.send(JSON.stringify({ tipo: 'confirmar', si: true }));
  await tablet.mensaje(m => m.tipo === 'estado' && m.estado.eventos.filter((e: Evento) => e.origen === 'camara').length > camaraAntes);

  const ultimo = ((await app.inject({ url: `/api/cirugias/${id}/eventos`, cookies })).json() as Evento[]).at(-1)!;
  assert.equal(ultimo.origen, 'camara');
  assert.deepEqual(ultimo.datos, { tipo: 'conteo', material, cantidad: -1 });
  assert.equal(ultimo.texto, `Cámara: ${material} ${visto[material]}`);

  const capturas = (await app.inject({ url: `/api/cirugias/${id}/capturas`, cookies })).json() as Captura[];
  const captura = capturas.at(-1)!;
  assert.equal(captura.modo, 'conteo');
  assert.equal(captura.dispositivo, 'Celular prueba');
  assert.deepEqual(captura.resultado.conteo, visto);
  const imagen = await app.inject({ url: `/api/capturas/${captura.id}/imagen`, cookies });
  assert.equal(imagen.headers['content-type'], 'image/jpeg');
  assert.deepEqual(imagen.rawPayload, foto);

  const norte = await entrar('norte');
  assert.equal((await app.inject({ url: `/api/capturas/${captura.id}/imagen`, cookies: { [COOKIE]: norte } })).statusCode, 404);
  assert.deepEqual((await app.inject({ url: `/api/cirugias/${id}/capturas`, cookies: { [COOKIE]: norte } })).json(), []);
  assert.equal((await app.inject({ url: `/api/capturas/${captura.id}/imagen` })).statusCode, 401);

  tablet.ws.terminate();
  cel.ws.terminate();
});

test('un código inválido cierra el WebSocket de la cámara', async () => {
  const cel = await conectar('/api/camara/ws');
  cel.ws.send(JSON.stringify({ tipo: 'vincular', codigo: 'AAAA2222', dispositivo: 'Intruso' }));
  assert.equal(await cel.cierre(), 4002);
});

test('las fotos de la cámara no se pueden modificar ni borrar', async () => {
  const { rows: [c] } = await pool.query("SELECT id FROM clinica WHERE slug = 'caribe'");
  await assert.rejects(conClinica(c.id, q => q.query("UPDATE captura SET dispositivo = 'x'")), /permission denied/);
  await assert.rejects(conClinica(c.id, q => q.query('DELETE FROM captura')), /permission denied/);
});
