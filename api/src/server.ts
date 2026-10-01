import { crearApp } from './app.ts';
import { migrar } from './db.ts';
import { sembrar } from './siembra.ts';

await migrar();
await sembrar();
const app = await crearApp();
await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 8080) });
