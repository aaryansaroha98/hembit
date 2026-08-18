import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { publicRouter } from './routes/public.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { checkoutRouter } from './routes/checkout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, './data/uploads');

function buildAllowedOrigins() {
  const defaultOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'];
  const envOrigins = String(process.env.FRONTEND_URL || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const origins = new Set();
  const hostnames = new Set();

  for (const origin of [...defaultOrigins, ...envOrigins]) {
    const trimmed = origin.replace(/\/+$/, '');
    origins.add(trimmed);
    try {
      const url = new URL(trimmed);
      hostnames.add(url.hostname.replace(/^www\./, ''));
    } catch {
      /* ignore malformed origin */
    }
  }

  return { origins, hostnames };
}

export function createServer() {
  const app = express();
  const { origins: allowedOrigins, hostnames: allowedHostnames } = buildAllowedOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin.replace(/\/+$/, ''))) return callback(null, true);
        try {
          const hostname = new URL(origin).hostname.replace(/^www\./, '');
          if (allowedHostnames.has(hostname)) return callback(null, true);
        } catch {
          /* ignore malformed origin */
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '12mb' }));
  app.use('/uploads', express.static(uploadsDir));

  app.get('/api/health', (_, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/public', publicRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/checkout', checkoutRouter);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Unexpected server error' });
  });

  return app;
}
