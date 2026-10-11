const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { randomUUID } = require('crypto');
const { body, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { getConsultationResponse, generateTitle, generateCareSummary } = require('../services/localAI');
const { matchDoctors, inferSpecialty } = require('../services/referral');
const { SEVERITY_META } = require('../services/triage');
const { extractAndStoreMemories, getActiveMemories } = require('../services/localMemory');

const router = express.Router();
router.use(authenticate);

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: 'You are sending messages too quickly. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- File upload setup (photos of rashes/injuries, lab results, prescriptions) ---
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../data/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).slice(0, 10)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) return cb(new Error('Unsupported file type'));
    cb(null, true);
  },
});

function getPreferences(userId) {
  let prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
  if (!prefs) {
    db.prepare('INSERT INTO user_preferences (user_id) VALUES (?)').run(userId);
    prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
  }
  return prefs;
}

// List all conversations for the logged-in user (optionally filtered by project)
router.get('/', (req, res) => {
  const { projectId } = req.query;
  const conversations = projectId
    ? db
        .prepare(
          `SELECT id, title, status, latest_severity, project_id, created_at, updated_at
           FROM conversations WHERE user_id = ? AND project_id = ? ORDER BY updated_at DESC`
        )
        .all(req.userId, projectId)
    : db
        .prepare(
          `SELECT id, title, status, latest_severity, project_id, created_at, updated_at
           FROM conversations WHERE user_id = ? ORDER BY updated_at DESC`
        )
        .all(req.userId);
  res.json({ conversations });
});

// Get a single conversation with all messages + any attachments
router.get('/:id', param('id').isUUID(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid conversation id' });

  const conversation = db
    .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);

  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const messages = db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(conversation.id);

  const attachments = db
    .prepare(
      'SELECT id, message_id, kind, original_name, mime_type, size_bytes, created_at FROM attachments WHERE conversation_id = ?'
    )
    .all(conversation.id);

  res.json({ conversation, messages, attachments });
});

// Rename a conversation owned by the logged-in user
router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('title').optional().trim().isLength({ min: 1, max: 120 }),
    body('projectId').optional({ nullable: true }).isUUID(),
  ],
  (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid conversation update' });

  const conversation = db
    .prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const fields = [];
  const values = [];
  if (req.body.title !== undefined) {
    fields.push('title = ?');
    values.push(req.body.title);
  }
  if (req.body.projectId !== undefined) {
    if (req.body.projectId) {
      const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.body.projectId, req.userId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
    }
    fields.push('project_id = ?');
    values.push(req.body.projectId || null);
  }
  if (fields.length) {
    values.push(conversation.id);
    db.prepare(`UPDATE conversations SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...values);
  }
  res.json({ conversation: db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversation.id) });
  }
);

// Delete a conversation owned by the logged-in user
router.delete('/:id', param('id').isUUID(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid conversation id' });

  const conversation = db
    .prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const attachments = db.prepare('SELECT file_path FROM attachments WHERE conversation_id = ?').all(conversation.id);
  db.prepare('DELETE FROM conversations WHERE id = ?').run(conversation.id);
  attachments.forEach(({ file_path }) => fs.unlink(file_path, () => {}));
  res.status(204).send();
});

// Create a new conversation (optionally inside a project/case thread)
router.post('/', body('projectId').optional().isUUID(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid project id' });

  const { projectId } = req.body || {};
  if (projectId) {
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
  }

  const id = randomUUID();
  db.prepare(`INSERT INTO conversations (id, user_id, project_id, title) VALUES (?, ?, ?, 'New consultation')`).run(
    id,
    req.userId,
    projectId || null
  );
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  res.status(201).json({ conversation });
});

// Send a message in a conversation and get the AI response (supports up to 3 image/file attachments)
router.post(
  '/:id/messages',
  chatLimiter,
  upload.array('files', 3),
  [param('id').isUUID(), body('content').trim().isLength({ min: 1, max: 4000 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up any uploaded files if validation failed
      (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const conversation = db
      .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const { content } = req.body;

    try {
      // Load prior messages for context (last 20 turns to keep it bounded)
      const priorMessages = db
        .prepare(
          `SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20`
        )
        .all(conversation.id);

      const healthProfile = db
        .prepare('SELECT * FROM user_health_profile WHERE user_id = ?')
        .get(req.userId);

      const memories = getActiveMemories(req.userId);
      const preferences = getPreferences(req.userId);

      // Save user message
      const userMsgId = randomUUID();
      db.prepare(
        `INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)`
      ).run(userMsgId, conversation.id, content);

      // Persist attachment records for any uploaded files
      const attachments = (req.files || []).map((f) => {
        const attId = randomUUID();
        const kind = f.mimetype.startsWith('image/') ? 'image' : 'document';
        db.prepare(
          `INSERT INTO attachments (id, message_id, conversation_id, user_id, kind, original_name, mime_type, file_path, size_bytes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(attId, userMsgId, conversation.id, req.userId, kind, f.originalname, f.mimetype, f.path, f.size);
        return { id: attId, kind, original_name: f.originalname, mime_type: f.mimetype, file_path: f.path };
      });

      // Get AI response (vision-aware, memory-aware, style/language-aware)
      const { text, severity, redFlagOverride, differential } = await getConsultationResponse(priorMessages, content, {
        healthProfile,
        memories,
        attachments,
        preferences,
        userId: req.userId,
        conversationId: conversation.id,
      });

      // Save assistant message
      const assistantMsgId = randomUUID();
      db.prepare(
        `INSERT INTO messages (id, conversation_id, role, content, severity) VALUES (?, ?, 'assistant', ?, ?)`
      ).run(assistantMsgId, conversation.id, text, severity);

      // Update conversation severity + timestamp
      db.prepare(
        `UPDATE conversations SET latest_severity = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(severity, conversation.id);

      // Generate a title from the first user message before returning the response.
      let conversationTitle = conversation.title;
      if (conversation.title === 'New consultation' && priorMessages.length === 0) {
        conversationTitle = await generateTitle(content);
        db.prepare(`UPDATE conversations SET title = ? WHERE id = ?`).run(conversationTitle, conversation.id);
      }

      // Best-effort: learn durable facts for future visits (never blocks the response)
      extractAndStoreMemories({
        userId: req.userId,
        conversationId: conversation.id,
        userMessage: content,
        assistantMessage: text,
      });

      // If severity warrants it, prepare a referral suggestion (not auto-created, just surfaced)
      let referralSuggestion = null;
      if (severity === 'see_doctor' || severity === 'urgent') {
        const specialty = inferSpecialty(content);
        const user = db.prepare('SELECT city FROM users WHERE id = ?').get(req.userId);
        const doctors = matchDoctors({ city: user?.city, specialty, severity, limit: 3 });
        referralSuggestion = { specialty, doctors };
      }

      res.json({
        userMessage: {
          id: userMsgId,
          role: 'user',
          content,
          created_at: new Date().toISOString(),
          attachments: attachments.map((a) => ({ id: a.id, kind: a.kind, original_name: a.original_name })),
        },
        assistantMessage: {
          id: assistantMsgId,
          role: 'assistant',
          content: text,
          severity,
          meta: SEVERITY_META[severity],
          differential,
          created_at: new Date().toISOString(),
        },
        conversation: { ...conversation, title: conversationTitle },
        redFlagOverride,
        referralSuggestion,
      });
    } catch (err) {
      console.error('Chat error:', err);
      res.status(500).json({ error: 'Something went wrong generating a response. Please try again.' });
    }
  }
);

// Stream/serve an attachment file (owner-only)
router.get('/attachments/:attachmentId/file', param('attachmentId').isUUID(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid attachment id' });

  const att = db
    .prepare('SELECT * FROM attachments WHERE id = ? AND user_id = ?')
    .get(req.params.attachmentId, req.userId);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });
  if (!fs.existsSync(att.file_path)) return res.status(404).json({ error: 'File no longer available' });

  res.setHeader('Content-Type', att.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${att.original_name}"`);
  fs.createReadStream(att.file_path).pipe(res);
});

// Generate a downloadable consultation summary document (Medora's Artifact equivalent)
router.get('/:id/summary', param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid conversation id' });

  const conversation = db
    .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const messages = db
    .prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(conversation.id);
  if (messages.length === 0) return res.status(400).json({ error: 'Nothing to summarize yet' });

  const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(req.userId);

  try {
    const summary = await generateCareSummary(messages, {
      patientName: user?.full_name,
      latestSeverity: conversation.latest_severity,
    });
    res.json({ summary });
  } catch (err) {
    console.error('Summary generation error:', err);
    res.status(500).json({ error: 'Could not generate the consultation summary right now.' });
  }
});

// Update conversation status/project (e.g. mark resolved/archived, move to a case thread)
router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('status').optional().isIn(['active', 'resolved', 'referred', 'archived']),
    body('projectId').optional({ nullable: true }).isUUID(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const conversation = db
      .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    if (req.body.status) {
      db.prepare(`UPDATE conversations SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(
        req.body.status,
        conversation.id
      );
    }
    if (req.body.projectId !== undefined) {
      db.prepare(`UPDATE conversations SET project_id = ?, updated_at = datetime('now') WHERE id = ?`).run(
        req.body.projectId,
        conversation.id
      );
    }
    const updated = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversation.id);
    res.json({ conversation: updated });
  }
);

// Delete a conversation
router.delete('/:id', param('id').isUUID(), (req, res) => {
  const result = db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.userId
  );
  if (result.changes === 0) return res.status(404).json({ error: 'Conversation not found' });
  res.json({ success: true });
});

module.exports = router;
