require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Medora API', time: new Date().toISOString() });
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

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Medora API listening on port ${PORT}`);
});
