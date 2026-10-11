const express = require('express');
const { randomUUID } = require('crypto');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// List referrals for the user
router.get('/', (req, res) => {
  const referrals = db
    .prepare(
      `SELECT r.*, d.full_name as doctor_name, d.clinic_name, d.phone as doctor_phone, d.specialty
       FROM referrals r LEFT JOIN doctors d ON r.doctor_id = d.id
       WHERE r.user_id = ? ORDER BY r.created_at DESC`
    )
    .all(req.userId);
  res.json({ referrals });
});

// Create a referral (user confirms they want to book with a suggested doctor)
router.post(
  '/',
  [
    body('conversationId').isUUID(),
    body('doctorId').isUUID(),
    body('severity').isIn(['see_doctor', 'urgent']),
    body('reason').trim().isLength({ min: 1, max: 500 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { conversationId, doctorId, severity, reason } = req.body;

    const conversation = db
      .prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?')
      .get(conversationId, req.userId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const doctor = db.prepare('SELECT id FROM doctors WHERE id = ?').get(doctorId);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const id = randomUUID();
    db.prepare(
      `INSERT INTO referrals (id, user_id, conversation_id, doctor_id, severity, reason) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, req.userId, conversationId, doctorId, severity, reason);

    db.prepare(`UPDATE conversations SET status = 'referred' WHERE id = ?`).run(conversationId);

    const referral = db.prepare('SELECT * FROM referrals WHERE id = ?').get(id);
    res.status(201).json({ referral });
  }
);

router.patch(
  '/:id',
  [param('id').isUUID(), body('status').isIn(['pending', 'contacted', 'completed', 'cancelled'])],
  (req, res) => {
    const result = db
      .prepare('UPDATE referrals SET status = ? WHERE id = ? AND user_id = ?')
      .run(req.body.status, req.params.id, req.userId);
    if (result.changes === 0) return res.status(404).json({ error: 'Referral not found' });
    const referral = db.prepare('SELECT * FROM referrals WHERE id = ?').get(req.params.id);
    res.json({ referral });
  }
);

module.exports = router;
