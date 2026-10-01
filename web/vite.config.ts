import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // HB_API apunta el proxy a otro API local; por defecto, el de `npm run dev` en api/.
  server: { proxy: { '/api': { target: process.env.HB_API ?? 'http://localhost:8080', ws: true } } },
});
