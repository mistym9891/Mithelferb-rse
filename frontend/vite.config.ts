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
  // Für den Kundentest wird die Vorschau über einen Cloudflare-Tunnel
  // veröffentlicht. Vite lehnt fremde Host-Header sonst ab; die Tunnel-Domain
  // muss deshalb ausdrücklich erlaubt werden.
  preview: {
    port: 4173,
    host: true,
    proxy,
    allowedHosts: ['.trycloudflare.com', '.cfargotunnel.com', '.ts.net', 'localhost'],
  },
});
