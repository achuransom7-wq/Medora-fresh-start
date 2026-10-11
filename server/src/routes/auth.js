const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID, createHash } = require('crypto');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { signAccessToken, signRefreshToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function issueTokens(res, userId) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`).run(
    randomUUID(),
    userId,
    hashToken(refreshToken),
    expiresAt
  );

  res.cookie('medora_refresh', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  return accessToken;
}

router.post(
  '/register',
  authLimiter,
  [
    body('fullName').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('phone').optional().trim().isLength({ max: 20 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { fullName, email, password, phone, city, region } = req.body;

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const id = randomUUID();
    const passwordHash = bcrypt.hashSync(password, 12);

    db.prepare(
      `INSERT INTO users (id, full_name, email, phone, password_hash, city, region) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, fullName, email, phone || null, passwordHash, city || null, region || null);

    db.prepare(`INSERT INTO user_health_profile (user_id) VALUES (?)`).run(id);

    const accessToken = issueTokens(res, id);
    res.status(201).json({
      accessToken,
      user: { id, fullName, email, phone: phone || null, city: city || null, region: region || null },
    });
  }
);

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid email or password' });

    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = issueTokens(res, user.id);
    res.json({
      accessToken,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        region: user.region,
      },
    });
  }
);

router.post('/refresh', (req, res) => {
  const token = req.cookies?.medora_refresh;
  if (!token) return res.status(401).json({ error: 'No refresh token provided' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'refresh') throw new Error('Invalid token type');

    const tokenHash = hashToken(token);
    const stored = db
      .prepare('SELECT * FROM refresh_tokens WHERE user_id = ? AND token_hash = ?')
      .get(payload.sub, tokenHash);

    if (!stored || new Date(stored.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Refresh token expired or invalid' });
    }

    const accessToken = signAccessToken(payload.sub);
    res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', (req, res) => {
  const token = req.cookies?.medora_refresh;
  if (token) {
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hashToken(token));
  }
  res.clearCookie('medora_refresh', { path: '/api/auth' });
  res.json({ success: true });
});

module.exports = router;
