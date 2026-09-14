import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import pool from './db';
import authRoutes from './routes/auth';
import staffRoutes from './routes/staff';
import availabilityRoutes, { setIo } from './routes/availability';
import ringRoutes from './routes/rings';
import availableStaffRoutes from './routes/availableStaff';
import { startCleanupCron } from './cron/cleanupAvailabilities';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? 'https://your-frontend-url.com' : '*',
    methods: ['GET', 'POST'],
  },
});

// Pass io to availability routes for real-time events
setIo(io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api', availabilityRoutes); // for /api/staff/:staffId/availability
app.use('/api/rings', ringRoutes);
app.use('/api/available-staff', availableStaffRoutes);

// Health check
app.get('/health', (req, res) => res.send('OK'));

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => console.log('Client disconnected'));
});

// Start cron job for expiring availabilities (runs daily)
startCleanupCron();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});