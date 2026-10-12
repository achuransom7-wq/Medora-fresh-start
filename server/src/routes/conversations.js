const express = require('express');
const fs = require('fs');
const os = require('os');
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
const fileStorage = require('../services/fileStorage');
const ensureWritableDirectory = require('../utils/ensureWritableDirectory');

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
const STAGING_DIR = fileStorage.isRemoteStorageEnabled()
  ? process.env.UPLOAD_TEMP_DIR || path.join(os.tmpdir(), 'medora-upload-staging')
  : UPLOAD_DIR;
ensureWritableDirectory(STAGING_DIR, 'Upload staging storage');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, STAGING_DIR),
    filename: (req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).slice(0, 10)}`),
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 3,
    fields: 1,
    fieldSize: 16 * 1024,
    fieldNameSize: 100,
    parts: 4,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) return cb(new Error('Unsupported file type'));
    cb(null, true);
  },
});

async function cleanupStagedUploads(files) {
  const results = await Promise.allSettled(
    files.map((file) =>
      fs.promises.unlink(file.path).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      })
    )
  );
  for (const result of results) {
    if (result.status === 'rejected') console.error('Upload staging cleanup failed:', result.reason);
  }
}

function receiveUploads(req, res, next) {
  upload.array('files', 3)(req, res, async (error) => {
    if (!error) return next();

    await cleanupStagedUploads(req.files || []);
    const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      error: status === 413 ? 'Each attachment must be 10 MB or smaller.' : 'The attachment request is invalid or uses an unsupported file type.',
    });
  });
}

async function getPreferences(userId) {
  let prefs = await db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
  if (!prefs) {
    await db.prepare('INSERT INTO user_preferences (user_id) VALUES (?)').run(userId);
    prefs = await db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
  }
  return prefs;
}

async function requireOwnedConversation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid conversation id' });

  const conversation = await db
    .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  req.conversation = conversation;
  next();
}

// List all conversations for the logged-in user (optionally filtered by project)
router.get('/', async (req, res) => {
  const { projectId } = req.query;
  const conversations = await (projectId
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
        .all(req.userId));
  res.json({ conversations });
});

// Get a single conversation with all messages + any attachments
router.get('/:id', param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid conversation id' });

  const conversation = await db
    .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);

  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const messages = await db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(conversation.id);

  const attachments = await db
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
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid conversation update' });

  const conversation = await db
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
      const project = await db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.body.projectId, req.userId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
    }
    fields.push('project_id = ?');
    values.push(req.body.projectId || null);
  }
  if (fields.length) {
    values.push(conversation.id);
    await db.prepare(`UPDATE conversations SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...values);
  }
  res.json({ conversation: await db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversation.id) });
  }
);

// Delete a conversation owned by the logged-in user
router.delete('/:id', param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid conversation id' });

  const conversation = await db
    .prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const attachments = await db.prepare('SELECT file_path FROM attachments WHERE conversation_id = ?').all(conversation.id);
  await fileStorage.deleteFiles(attachments.map(({ file_path }) => file_path));
  await db.prepare('DELETE FROM conversations WHERE id = ?').run(conversation.id);
  res.status(204).send();
});

// Create a new conversation (optionally inside a project/case thread)
router.post('/', body('projectId').optional().isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid project id' });

  const { projectId } = req.body || {};
  if (projectId) {
    const project = await db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
  }

  const id = randomUUID();
  await db.prepare(`INSERT INTO conversations (id, user_id, project_id, title) VALUES (?, ?, ?, 'New consultation')`).run(
    id,
    req.userId,
    projectId || null
  );
  const conversation = await db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  res.status(201).json({ conversation });
});

// Send a message in a conversation and get the AI response (supports up to 3 image/file attachments)
router.post(
  '/:id/messages',
  chatLimiter,
  param('id').isUUID(),
  requireOwnedConversation,
  receiveUploads,
  body('content').trim().isLength({ min: 1, max: 4000 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await cleanupStagedUploads(req.files || []);
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const conversation = req.conversation;

    const { content } = req.body;
    const storedReferences = [];
    const persistedReferences = new Set();

    try {
      // Load prior messages for context (last 20 turns to keep it bounded)
      const priorMessages = await db
        .prepare(
          `SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20`
        )
        .all(conversation.id);

      const healthProfile = await db
        .prepare('SELECT * FROM user_health_profile WHERE user_id = ?')
        .get(req.userId);

      const memories = await getActiveMemories(req.userId);
      const preferences = await getPreferences(req.userId);

      // Save user message
      const userMsgId = randomUUID();
      await db.prepare(
        `INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)`
      ).run(userMsgId, conversation.id, content);

      // Persist attachment records for any uploaded files
      const attachments = [];
      for (const f of req.files || []) {
        const attId = randomUUID();
        const kind = f.mimetype.startsWith('image/') ? 'image' : 'document';
        const fileReference = await fileStorage.storeUpload(
          f.path,
          `uploads/${attId}${path.extname(f.originalname).slice(0, 10)}`,
          f.mimetype
        );
        storedReferences.push(fileReference);
        if (fileStorage.isRemoteStorageEnabled()) await fs.promises.unlink(f.path);
        await db.prepare(
          `INSERT INTO attachments (id, message_id, conversation_id, user_id, kind, original_name, mime_type, file_path, size_bytes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(attId, userMsgId, conversation.id, req.userId, kind, f.originalname, f.mimetype, fileReference, f.size);
        persistedReferences.add(fileReference);
        attachments.push({ id: attId, kind, original_name: f.originalname, mime_type: f.mimetype, file_path: fileReference });
      }

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
      await db.prepare(
        `INSERT INTO messages (id, conversation_id, role, content, severity) VALUES (?, ?, 'assistant', ?, ?)`
      ).run(assistantMsgId, conversation.id, text, severity);

      // Update conversation severity + timestamp
      await db.prepare(
        `UPDATE conversations SET latest_severity = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(severity, conversation.id);

      // Generate a title from the first user message before returning the response.
      let conversationTitle = conversation.title;
      if (conversation.title === 'New consultation' && priorMessages.length === 0) {
        conversationTitle = await generateTitle(content);
        await db.prepare(`UPDATE conversations SET title = ? WHERE id = ?`).run(conversationTitle, conversation.id);
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
        const user = await db.prepare('SELECT city FROM users WHERE id = ?').get(req.userId);
        const doctors = await matchDoctors({ city: user?.city, specialty, severity, limit: 3 });
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
      const orphanedReferences = storedReferences.filter((reference) => !persistedReferences.has(reference));
      await fileStorage.deleteFiles(orphanedReferences);
      await cleanupStagedUploads(req.files || []);
      res.status(500).json({ error: 'Something went wrong generating a response. Please try again.' });
    }
  }
);

// Stream/serve an attachment file (owner-only)
router.get('/attachments/:attachmentId/file', param('attachmentId').isUUID(), async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid attachment id' });

  const att = await db
    .prepare('SELECT * FROM attachments WHERE id = ? AND user_id = ?')
    .get(req.params.attachmentId, req.userId);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });

  res.setHeader('Content-Type', att.mime_type);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', att.kind === 'image' ? 'inline; filename="medora-image"' : 'attachment; filename="medora-document"');
  try {
    const file = await fileStorage.readFile(att.file_path);
    res.send(file);
  } catch (error) {
    if (error.code === 'NoSuchKey' || error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File no longer available' });
    }
    next(error);
  }
});

// Generate a downloadable consultation summary document (Medora's Artifact equivalent)
router.get('/:id/summary', param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid conversation id' });

  const conversation = await db
    .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const messages = await db
    .prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(conversation.id);
  if (messages.length === 0) return res.status(400).json({ error: 'Nothing to summarize yet' });

  const user = await db.prepare('SELECT full_name FROM users WHERE id = ?').get(req.userId);

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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const conversation = await db
      .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    if (req.body.status) {
      await db.prepare(`UPDATE conversations SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(
        req.body.status,
        conversation.id
      );
    }
    if (req.body.projectId !== undefined) {
      await db.prepare(`UPDATE conversations SET project_id = ?, updated_at = datetime('now') WHERE id = ?`).run(
        req.body.projectId,
        conversation.id
      );
    }
    const updated = await db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversation.id);
    res.json({ conversation: updated });
  }
);

// Delete a conversation
router.delete('/:id', param('id').isUUID(), async (req, res) => {
  const attachments = await db
    .prepare('SELECT file_path FROM attachments WHERE conversation_id = ? AND user_id = ?')
    .all(req.params.id, req.userId);
  await fileStorage.deleteFiles(attachments.map(({ file_path }) => file_path));
  const result = await db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Conversation not found' });
  res.json({ success: true });
});

module.exports = router;
