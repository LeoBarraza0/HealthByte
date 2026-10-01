import { crearApp } from './app.ts';
import { migrar } from './db.ts';
import { sembrar } from './siembra.ts';
import { crearJev } from './jev.ts';
import { interpretar } from './interprete.ts';
import { crearCanalVoz } from './voz.ts';
import { crearVision } from './vision.ts';
import { crearAsistente, interpretarConAsistente } from './asistente.ts';

await migrar();
await sembrar();
const jev = crearJev(process.env.JEV_API_KEY ?? '');
const proyecto = process.env.GOOGLE_CLOUD_PROJECT ?? '';
// Gemini propone y Jev confirma. Con ASISTENTE_VOZ=off, o sin proyecto de GCP, decide solo Jev como antes.
const asistente = proyecto && process.env.ASISTENTE_VOZ !== 'off' ? crearAsistente({ proyecto, modelo: process.env.ASISTENTE_MODELO }) : null;
const app = await crearApp({
  interpretar: (frase, estado, hayPendiente) => {
    const soloJev = () => interpretar(frase, estado, hayPendiente, jev);
    return asistente ? interpretarConAsistente(frase, estado, hayPendiente, asistente, jev, soloJev) : soloJev();
  },
  abrirVoz: (eventos, frases) => crearCanalVoz({ ...eventos, frases, proyecto }),
  analizar: crearVision({ proyecto, modelo: process.env.VISION_MODELO }),
});
await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 8080) });
