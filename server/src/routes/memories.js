const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// List everything Medora remembers about the patient (active by default)
router.get('/', (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const memories = includeInactive
    ? db.prepare('SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC').all(req.userId)
    : db.prepare('SELECT * FROM memories WHERE user_id = ? AND active = 1 ORDER BY created_at DESC').all(req.userId);
  res.json({ memories });
});

// Manually add a memory (e.g. patient wants to make sure something is remembered)
router.post(
  '/',
  [
    body('content').trim().isLength({ min: 2, max: 500 }),
    body('category').isIn(['allergy', 'condition', 'medication', 'pattern', 'preference', 'other']),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { randomUUID } = require('crypto');
    const id = randomUUID();
    db.prepare('INSERT INTO memories (id, user_id, category, content) VALUES (?, ?, ?, ?)').run(
      id,
      req.userId,
      req.body.category,
      req.body.content
    );
    res.status(201).json({ memory: db.prepare('SELECT * FROM memories WHERE id = ?').get(id) });
  }
);

// Edit or deactivate ("forget") a memory
router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('content').optional().trim().isLength({ min: 2, max: 500 }),
    body('active').optional().isBoolean(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!memory) return res.status(404).json({ error: 'Memory not found' });

    const fields = [];
    const values = [];
    if (req.body.content !== undefined) {
      fields.push('content = ?');
      values.push(req.body.content);
    }
    if (req.body.active !== undefined) {
      fields.push('active = ?');
      values.push(req.body.active ? 1 : 0);
    }
    if (fields.length) {
      values.push(memory.id);
      db.prepare(`UPDATE memories SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...values);
    }
    res.json({ memory: db.prepare('SELECT * FROM memories WHERE id = ?').get(memory.id) });
  }
);

// Permanently delete a memory
router.delete('/:id', param('id').isUUID(), (req, res) => {
  const result = db.prepare('DELETE FROM memories WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Memory not found' });
  res.json({ success: true });
});

module.exports = router;
