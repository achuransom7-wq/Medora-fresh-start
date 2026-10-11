const express = require('express');
const { randomUUID } = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { researchHealthTopic } = require('../services/localResearch');

const router = express.Router();
router.use(authenticate);

// Research is a heavier call (web search + generation) — keep it tightly rate limited
const researchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  message: { error: 'Too many research requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Run a deep-dive, cited lookup on a health topic ("Learn more" on an assistant message)
router.post(
  '/',
  researchLimiter,
  [
    body('query').trim().isLength({ min: 3, max: 300 }),
    body('conversationId').optional().isUUID(),
    body('context').optional().trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { query, conversationId, context } = req.body;

    if (conversationId) {
      const conversation = db
        .prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?')
        .get(conversationId, req.userId);
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    }

    try {
      const { content, sources } = await researchHealthTopic(query, { conversationContext: context });

      const id = randomUUID();
      db.prepare(
        `INSERT INTO research_reports (id, conversation_id, user_id, query, content, sources) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, conversationId || null, req.userId, query, content, JSON.stringify(sources));

      res.status(201).json({ report: { id, query, content, sources, created_at: new Date().toISOString() } });
    } catch (err) {
      console.error('Research error:', err);
      res.status(500).json({ error: 'Could not complete that lookup right now. Please try again.' });
    }
  }
);

// List past research reports (optionally scoped to a conversation)
router.get('/', (req, res) => {
  const { conversationId } = req.query;
  const rows = conversationId
    ? db
        .prepare('SELECT * FROM research_reports WHERE user_id = ? AND conversation_id = ? ORDER BY created_at DESC')
        .all(req.userId, conversationId)
    : db.prepare('SELECT * FROM research_reports WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);

  res.json({ reports: rows.map((r) => ({ ...r, sources: JSON.parse(r.sources || '[]') })) });
});

module.exports = router;
