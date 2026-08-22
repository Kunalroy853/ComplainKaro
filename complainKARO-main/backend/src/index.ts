import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { requestLogger } from './middleware/logger';
import { initWebSocketServer } from './services/websocket';
import authRoutes from './routes/auth';
import complaintsRoutes from './routes/complaints';
import ticketsRoutes from './routes/tickets';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('vercel.app') || origin === FRONTEND_URL || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Serve locally stored audio files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/tickets', ticketsRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      gemini: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here',
      cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
      whisper: !!(process.env.WHISPER_BINARY_PATH),
    },
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(JSON.stringify({ level: 'error', stage: 'express', error: err.message }));
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── HTTP + WebSocket Server ──────────────────────────────────────────────────
const server = http.createServer(app);
initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(JSON.stringify({
    level: 'info',
    stage: 'startup',
    status: 'ready',
    port: PORT,
    frontend_url: FRONTEND_URL,
    node_env: process.env.NODE_ENV || 'development',
  }));
});

export default app;
