require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const referralRoutes = require('./routes/referrals');
const doctorRoutes = require('./routes/doctors');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const memoryRoutes = require('./routes/memories');
const vitalsRoutes = require('./routes/vitals');
const researchRoutes = require('./routes/research');
const preferencesRoutes = require('./routes/preferences');
const localAgentFeedbackRoutes = require('./routes/localAgentFeedback');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy (needed on Render/behind reverse proxies for correct rate limiting/IP)
app.set('trust proxy', 1);

app.use(compression());
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(',') || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Liveness: no DB call, so uptime monitors and Render health checks stay cheap and fast.
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// Readiness: confirms the database is reachable and reports 503 (not a crash) when it is not.
app.get('/api/health', async (req, res) => {
  try {
    await db.prepare('SELECT 1 AS ok').get();
    res.json({ status: 'ok', service: 'Medora API', time: new Date().toISOString() });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({ status: 'degraded', service: 'Medora API' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/local-agent', localAgentFeedbackRoutes);

// 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const clientDist = path.resolve(__dirname, '../../client/dist');
// Hashed build assets can be cached for a year; HTML must always be revalidated.
app.use(
  express.static(clientDist, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  })
);

// Only real app routes get a 200; anything else returns 404 (with the app shell so the client can show its Not Found page).
const APP_ROUTES = /^\/(?:|login|register|consent|profile|referrals|chat\/[\w-]+|legal\/[\w-]+)\/?$/;
app.get(/.*/, (req, res, next) => {
  res.status(APP_ROUTES.test(req.path) ? 200 : 404);
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next(err);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await db.initialize();
    const server = app.listen(PORT, () => {
      console.log(`Medora API listening on port ${PORT}`);
    });
    // Keep-alive slightly above typical proxy timeouts avoids sporadic 502s behind Render's load balancer.
    server.keepAliveTimeout = 65 * 1000;
    server.headersTimeout = 66 * 1000;

    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        await db.close();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Database initialization failed:', error);
    await db.close();
    process.exitCode = 1;
  }
}

// Log and keep serving instead of letting one stray rejection take the whole app down.
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
process.on('uncaughtException', (error) => console.error('Uncaught exception:', error));

start();
