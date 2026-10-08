import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import './db.js';
import { seed } from './seed.js';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import learnerRoutes from './routes/learner.js';
import adminRoutes from './routes/admin.js';
import serviceRoutes from './routes/service.js';
import { AUDIO_DIR } from './data/lessons/deck.js';

seed();

const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      frameSrc: ['https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://player.vimeo.com'],
      mediaSrc: ["'self'", 'https:'],
      connectSrc: ["'self'"],
    },
  },
}));
const origins = (process.env.CORS_ORIGIN || 'http://localhost:3006').split(',').map((s) => s.trim());
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '100kb' }));

// Pre-generated lesson narration (scripts/tts). Served before the rate limiter: a lesson loads dozens of short clips.
app.use('/api/audio', express.static(AUDIO_DIR, { maxAge: '30d', immutable: true }));

const limiter = (max, minutes = 15) => rateLimit({ windowMs: minutes * 60000, max, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Wait a few minutes and try again.' } });
app.use('/api/auth/login', limiter(20));
app.use('/api/auth/register', limiter(20));
app.use('/api/enquiries', limiter(30));
app.use('/api', limiter(600));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api', publicRoutes);
app.use('/api', learnerRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// In production the API also serves the built frontend (frontend/dist)
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Try again in a moment.' });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Core5Campus API on http://localhost:${port}`);
});
