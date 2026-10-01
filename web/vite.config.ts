import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// HB_HTTPS: carpeta con dev.key y dev.crt (ver README, «Cámara de la mesa»). Sirve en https a la red local: el celular
// solo deja usar la cámara en una dirección segura.
const certificados = process.env.HB_HTTPS;

export default defineConfig({
  plugins: [react()],
  server: {
    // HB_API apunta el proxy a otro API local; por defecto, el de `npm run dev` en api/.
    proxy: { '/api': { target: process.env.HB_API ?? 'http://localhost:8080', ws: true } },
    ...(certificados && {
      host: true,
      https: { key: readFileSync(`${certificados}/dev.key`), cert: readFileSync(`${certificados}/dev.crt`) },
    }),
  },
});
