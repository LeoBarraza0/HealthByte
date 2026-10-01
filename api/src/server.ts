import { crearApp } from './app.ts';
import { migrar } from './db.ts';
import { sembrar } from './siembra.ts';
import { crearJev } from './jev.ts';
import { interpretar } from './interprete.ts';
import { crearCanalVoz } from './voz.ts';

await migrar();
await sembrar();
const jev = crearJev(process.env.JEV_API_KEY ?? '');
const proyecto = process.env.GOOGLE_CLOUD_PROJECT ?? '';
const app = await crearApp({
  interpretar: (frase, estado, hayPendiente) => interpretar(frase, estado, hayPendiente, jev),
  abrirVoz: (eventos, frases) => crearCanalVoz({ ...eventos, frases, proyecto }),
});
await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 8080) });
