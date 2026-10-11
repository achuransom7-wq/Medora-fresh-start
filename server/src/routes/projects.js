const express = require('express');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateCareSummary } = require('../services/localAI');

const router = express.Router();
router.use(authenticate);

// List all projects (case threads) with a conversation count
router.get('/', (req, res) => {
  const projects = db
    .prepare(
      `SELECT p.*, COUNT(c.id) as conversation_count
       FROM projects p
       LEFT JOIN conversations c ON c.project_id = p.id
       WHERE p.user_id = ?
       GROUP BY p.id
       ORDER BY p.updated_at DESC`
    )
    .all(req.userId);
  res.json({ projects });
});

// Create a project (e.g. "Managing my asthma", "Dad's recovery after surgery")
router.post(
  '/',
  [body('title').trim().isLength({ min: 2, max: 120 }), body('description').optional().trim().isLength({ max: 500 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const id = randomUUID();
    db.prepare('INSERT INTO projects (id, user_id, title, description) VALUES (?, ?, ?, ?)').run(
      id,
      req.userId,
      req.body.title,
      req.body.description || null
    );
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json({ project });
  }
);

// Generate one consultation summary covering every consultation in a thread.
router.get('/:id/summary', param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid thread id' });

  const project = db.prepare('SELECT id, title, user_id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Thread not found' });

  const messages = db
    .prepare(
      `SELECT c.id AS conversation_id, m.role, m.content, m.severity
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE c.project_id = ? AND c.user_id = ?
       ORDER BY c.created_at ASC, m.created_at ASC`
    )
    .all(project.id, req.userId);

  if (!messages.length) return res.status(400).json({ error: 'This thread has no consultations to summarize yet.' });

  try {
    const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(req.userId);
    const latestSeverity = [...messages].reverse().find((message) => message.role === 'assistant' && message.severity)?.severity;
    const summary = await generateCareSummary(messages, {
      patientName: user?.full_name,
      latestSeverity,
      scopeLabel: `the "${project.title}" thread across ${new Set(messages.map((message) => message.conversation_id)).size || 'multiple'} consultations`,
    });
    res.json({ summary, title: project.title });
  } catch (err) {
    console.error('Thread summary generation error:', err);
    res.status(500).json({ error: 'Could not generate the thread consultation summary right now.' });
  }
});

// Update a project
router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('title').optional().trim().isLength({ min: 2, max: 120 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('status').optional().isIn(['active', 'resolved', 'archived']),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const fields = [];
    const values = [];
    for (const key of ['title', 'description', 'status']) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }
    if (fields.length) {
      values.push(project.id);
      db.prepare(`UPDATE projects SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...values);
    }
    res.json({ project: db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id) });
  }
);

// Delete a project (conversations are kept, just unlinked — see schema ON DELETE SET NULL)
router.delete('/:id', param('id').isUUID(), (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const attachments = db
    .prepare('SELECT file_path FROM attachments WHERE conversation_id IN (SELECT id FROM conversations WHERE project_id = ?)')
    .all(project.id);
  const deleteThread = db.transaction(() => {
    db.prepare('DELETE FROM conversations WHERE project_id = ? AND user_id = ?').run(project.id, req.userId);
    db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(project.id, req.userId);
  });
  deleteThread();
  attachments.forEach(({ file_path }) => fs.unlink(file_path, () => {}));
  res.json({ success: true });
});

module.exports = router;
