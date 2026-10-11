/**
 * Optional route: lets the frontend send "yes that's right" / "no that's not
 * it" feedback on a differential candidate, feeding Medora's local self-
 * learning loop (see services/localLearning.js).
 *
 * This is entirely optional — the local agent works fine without it. Wire it
 * up only if you want the self-learning aspect to actually receive feedback
 * from real usage instead of just logging "shown" events passively.
 *
 * To use: copy this file to server/src/routes/localAgentFeedback.js, then in
 * server/src/index.js add:
 *   const localAgentFeedbackRoutes = require('./routes/localAgentFeedback');
 *   app.use('/api/local-agent', localAgentFeedbackRoutes);
 *
 * Then from the frontend, after showing a differential, you could render
 * simple "This sounds right" / "Not this one" buttons per candidate and POST:
 *   POST /api/local-agent/feedback
 *   { conversationId, diseaseName, outcome: "confirmed" | "corrected" }
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { recordFeedback, getLearningStats } = require('../services/localLearning');

const router = express.Router();
router.use(authenticate);

router.post(
  '/feedback',
  [
    body('diseaseName').trim().isLength({ min: 2, max: 200 }),
    body('outcome').isIn(['confirmed', 'corrected']),
    body('conversationId').optional().isUUID(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      recordFeedback({
        userId: req.userId,
        conversationId: req.body.conversationId || null,
        diseaseName: req.body.diseaseName,
        outcome: req.body.outcome,
      });
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Could not record feedback right now.' });
    }
  }
);

// See what the agent has learned so far (counts per disease) — handy for a debug/admin view
router.get('/learning-stats', (req, res) => {
  res.json({ stats: getLearningStats() });
});

module.exports = router;
