import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import jwt from 'jsonwebtoken';
import os from 'os';
import { Server } from 'socket.io';
import pool from './db';
import authRoutes from './routes/auth';
import staffRoutes from './routes/staff';
import availabilityRoutes from './routes/availability';
import ringRoutes from './routes/rings';
import availableStaffRoutes from './routes/availableStaff';
import adminRoutes from './routes/admin';
import adminRingRoutes from './routes/adminRings';
import pushRoutes from './routes/push';
import { startCleanupCron } from './cron/cleanupAvailabilities';
import { setIo } from './services/notify';

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.FRONTEND_URL || '*';
const io = new Server(server, {
  cors: { origin: allowedOrigin, methods: ['GET', 'POST'], credentials: true },
  // Verbindung zügig als tot erkennen, damit der Client neu verbindet und
  // seine Daten frisch lädt.
  pingInterval: 20000,
  pingTimeout: 20000,
});

setIo(io);

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/staff', availabilityRoutes); // /api/staff/:staffId/availability
app.use('/api/rings', ringRoutes);
app.use('/api/available-staff', availableStaffRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin/rings', adminRingRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', db: 'OK', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'DEGRADED', db: 'FEHLER' });
  }
});

/**
 * Hilfsendpunkt für den Testbetrieb im lokalen Netz: liefert die
 * LAN-Adressen dieses Rechners, damit der QR-Code eine Adresse zeigt, die
 * auch von einem Handy erreichbar ist ("localhost" wäre dort das Handy selbst).
 * In der Produktion liefert APP_URL die richtige öffentliche Adresse.
 */
app.get('/api/network-info', (_req, res) => {
  const addresses: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        addresses.push(net.address);
      }
    }
  }
  res.json({
    appUrl: process.env.APP_URL || null,
    lanAddresses: addresses,
    frontendPort: parseInt(process.env.FRONTEND_PORT || '5173'),
  });
});

// --------------------------------------------------------------- Socket.IO

/**
 * Sockets werden authentifiziert und Räumen zugeordnet, damit Ereignisse
 * gezielt zugestellt werden können (eigener Ring, Administratoren).
 */
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
    || socket.handshake.headers.authorization?.split(' ')[1];
  if (!token) return next(new Error('Kein Token'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    socket.data.user = decoded;
    next();
  } catch {
    next(new Error('Ungültiges Token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  socket.join(`ring:${user.ringId}`);
  socket.join(`role:${user.role}`);
  if (user.role === 'ring_admin') socket.join(`ringadmin:${user.ringId}`);
  if (user.role === 'super_admin') {
    // Der Super-Admin bekommt die Administrationsereignisse aller Ringe.
    socket.join('role:super_admin');
  }
  console.log(`Client verbunden: ${user.email} (${user.role})`);

  // Der Client kann jederzeit einen frischen Stand anfordern.
  socket.on('requestRefresh', () => socket.emit('refresh', { reason: 'angefordert' }));

  socket.on('disconnect', () => console.log(`Client getrennt: ${user.email}`));
});

startCleanupCron();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} empfangen – fahre herunter ...`);
  io.close();
  server.close();
  await pool.end();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
