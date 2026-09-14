import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxy = {
  '/api': 'http://localhost:5000',
  '/auth': 'http://localhost:5000',
  '/socket.io': { target: 'http://localhost:5000', ws: true, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  // host: true macht den Dev-Server auch im lokalen Netz erreichbar – praktisch,
  // um die App auf einem echten Handy zu testen (http://<Rechner-IP>:5173).
  server: { port: 5173, host: true, proxy },
  preview: { port: 4173, host: true, proxy },
});
