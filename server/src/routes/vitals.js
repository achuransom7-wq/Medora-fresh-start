const express = require('express');
const { randomUUID } = require('crypto');
const { body, query, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const TYPES = [
  'weight',
  'temperature',
  'blood_pressure_systolic',
  'blood_pressure_diastolic',
  'heart_rate',
  'blood_glucose',
  'symptom_severity',
];

// List logged entries (optionally filtered by type)
router.get('/', query('type').optional().isIn(TYPES), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const entries = req.query.type
    ? db
        .prepare('SELECT * FROM vitals_logs WHERE user_id = ? AND type = ? ORDER BY recorded_at ASC')
        .all(req.userId, req.query.type)
    : db.prepare('SELECT * FROM vitals_logs WHERE user_id = ? ORDER BY recorded_at ASC').all(req.userId);
  res.json({ entries });
});

// Log a new reading
router.post(
  '/',
  [
    body('type').isIn(TYPES),
    body('value').isFloat(),
    body('unit').optional().trim().isLength({ max: 20 }),
    body('note').optional().trim().isLength({ max: 300 }),
    body('recordedAt').optional().isISO8601(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const id = randomUUID();
    db.prepare(
      `INSERT INTO vitals_logs (id, user_id, type, value, unit, note, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`
    ).run(id, req.userId, req.body.type, req.body.value, req.body.unit || null, req.body.note || null, req.body.recordedAt || null);

    res.status(201).json({ entry: db.prepare('SELECT * FROM vitals_logs WHERE id = ?').get(id) });
  }
);

// Simple trend analysis for one vital type: min/max/avg/latest/delta + a sparse series for charting.
// This is Medora's "data analysis" feature — plain-JS stats, no external service needed.
router.get('/summary', query('type').isIn(TYPES), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const rows = db
    .prepare('SELECT value, recorded_at FROM vitals_logs WHERE user_id = ? AND type = ? ORDER BY recorded_at ASC')
    .all(req.userId, req.query.type);

  if (rows.length === 0) {
    return res.json({ type: req.query.type, count: 0, series: [] });
  }

  const values = rows.map((r) => r.value);
  const latest = values[values.length - 1];
  const first = values[0];
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  res.json({
    type: req.query.type,
    count: values.length,
    latest,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: Math.round(avg * 100) / 100,
    deltaFromFirst: Math.round((latest - first) * 100) / 100,
    series: rows,
  });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM vitals_logs WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Entry not found' });
  res.json({ success: true });
});

module.exports = router;
