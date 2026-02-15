import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import connectDB from './config/db.js';
import './config/redis.js'; // Initialize Redis
import authRoutes from './routes/auth.js';
import signalementRoutes from './routes/signalement.js';
import analyticsRoutes from './routes/analytics.js';
import workflowRoutes from './routes/workflow.js';
import villageRoutes from './routes/village.js';
import adminRoutes from './routes/admin.js';
import dpeRoutes from './routes/dpe.js';
import level2Routes from './routes/level2.js';
import historyRoutes from './routes/history.js';
import { setSocketServer } from './services/socket.js';
import { startDeadlineScheduler } from './services/deadlineScheduler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (signatures, attachments)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Database connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/signalements', signalementRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/villages', villageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dpe', dpeRoutes);
app.use('/api/level2', level2Routes);
app.use('/api/history', historyRoutes);


// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hack For Hope API - SOS Villages d\'Enfants Tunisia',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      signalements: '/api/signalements',
      workflows: '/api/workflows',
      villages: '/api/villages',
      admin: '/api/admin',
      analytics: '/api/analytics'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : false
  }
});

setSocketServer(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Unauthorized'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    return next();
  } catch (error) {
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const role = socket.user?.role;
  const roleDetails = socket.user?.roleDetails;
  const userId = socket.user?.id;
  const villageId = socket.user?.village?._id || socket.user?.village;

  if (userId) socket.join(`user:${userId}`);
  if (role) socket.join(`role:${role}`);
  if (villageId) socket.join(`village:${villageId}`);
  if (role && villageId) socket.join(`role:${role}:village:${villageId}`);
  if (roleDetails) socket.join(`roleDetails:${roleDetails}`);
  if (roleDetails && villageId) socket.join(`roleDetails:${roleDetails}:village:${villageId}`);

  socket.emit('connected', { status: 'ok' });
});

server.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ API Base URL: http://localhost:${PORT}`);

  // Start deadline reminder scheduler
  startDeadlineScheduler();
});
