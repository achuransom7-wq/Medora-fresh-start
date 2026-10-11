const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function getOrCreate(userId) {
  let prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
  if (!prefs) {
    db.prepare('INSERT INTO user_preferences (user_id) VALUES (?)').run(userId);
    prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
  }
  return prefs;
}

router.get('/', (req, res) => {
  res.json({ preferences: getOrCreate(req.userId) });
});

router.put(
  '/',
  [
    body('communicationStyle').optional().isIn(['simple', 'standard', 'clinical']),
    body('language').optional().isIn(['en', 'fr', 'pidgin']),
    body('voiceEnabled').optional().isBoolean(),
    body('autoSpeakReplies').optional().isBoolean(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    getOrCreate(req.userId); // ensure row exists

    const map = {
      communicationStyle: 'communication_style',
      language: 'language',
      voiceEnabled: 'voice_enabled',
      autoSpeakReplies: 'auto_speak_replies',
    };
    const fields = [];
    const values = [];
    for (const [key, col] of Object.entries(map)) {
      if (req.body[key] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(typeof req.body[key] === 'boolean' ? (req.body[key] ? 1 : 0) : req.body[key]);
      }
    }
    if (fields.length) {
      values.push(req.userId);
      db.prepare(`UPDATE user_preferences SET ${fields.join(', ')}, updated_at = datetime('now') WHERE user_id = ?`).run(
        ...values
      );
    }
    res.json({ preferences: db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.userId) });
  }
);

module.exports = router;
