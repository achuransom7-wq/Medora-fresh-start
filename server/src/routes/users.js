const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const fileStorage = require('../services/fileStorage');

const router = express.Router();
router.use(authenticate);

router.delete('/me', async (req, res) => {
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const attachments = await db.prepare('SELECT file_path FROM attachments WHERE user_id = ?').all(req.userId);
  await fileStorage.deleteFiles(attachments.map(({ file_path }) => file_path));
  await db.prepare('DELETE FROM users WHERE id = ?').run(req.userId);
  res.clearCookie('medora_refresh', { path: '/api/auth' });
  res.status(204).send();
});

router.post(
  '/me/consent',
  [
    body('termsAccepted').custom((value) => value === true),
    body('healthDataConsent').custom((value) => value === true),
    body('cookieNoticeAccepted').custom((value) => value === true),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'All acknowledgements are required.' });

    await db.prepare(
      `UPDATE users SET terms_accepted_at = datetime('now'),
        health_data_consent_at = datetime('now'),
        cookie_notice_accepted_at = datetime('now'),
        consent_policy_version = ? WHERE id = ?`
    ).run('2026-10-11-v1', req.userId);

    const consent = await db.prepare(
      'SELECT terms_accepted_at, health_data_consent_at, cookie_notice_accepted_at FROM users WHERE id = ?'
    ).get(req.userId);
    res.json({ consent });
  }
);

router.get('/me', async (req, res) => {
  const user = await db
    .prepare('SELECT id, full_name, email, phone, date_of_birth, sex, city, region, created_at, terms_accepted_at, health_data_consent_at, cookie_notice_accepted_at FROM users WHERE id = ?')
    .get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const healthProfile = await db
    .prepare('SELECT * FROM user_health_profile WHERE user_id = ?')
    .get(req.userId);

  res.json({ user, healthProfile });
});

router.patch(
  '/me',
  [
    body('fullName').optional().trim().isLength({ min: 2, max: 100 }).escape(),
    body('phone').optional().trim().isLength({ max: 20 }),
    body('dateOfBirth').optional().isISO8601(),
    body('sex').optional().isIn(['male', 'female', 'other']),
    body('city').optional().trim().isLength({ max: 100 }).escape(),
    body('region').optional().trim().isLength({ max: 100 }).escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const fields = [];
    const values = [];
    const map = { fullName: 'full_name', phone: 'phone', dateOfBirth: 'date_of_birth', sex: 'sex', city: 'city', region: 'region' };

    for (const [key, col] of Object.entries(map)) {
      if (req.body[key] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(req.body[key]);
      }
    }

    if (fields.length > 0) {
      values.push(req.userId);
      await db.prepare(`UPDATE users SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...values);
    }

    const user = await db
      .prepare('SELECT id, full_name, email, phone, date_of_birth, sex, city, region FROM users WHERE id = ?')
      .get(req.userId);
    res.json({ user });
  }
);

router.put(
  '/me/health-profile',
  [
    body('allergies').optional().isArray(),
    body('chronicConditions').optional().isArray(),
    body('currentMedications').optional().isArray(),
    body('bloodType').optional().trim().isLength({ max: 10 }),
    body('emergencyContactName').optional().trim().isLength({ max: 100 }).escape(),
    body('emergencyContactPhone').optional().trim().isLength({ max: 20 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const {
      allergies,
      chronicConditions,
      currentMedications,
      bloodType,
      emergencyContactName,
      emergencyContactPhone,
    } = req.body;

    await db.prepare(
      `UPDATE user_health_profile SET
        allergies = COALESCE(?, allergies),
        chronic_conditions = COALESCE(?, chronic_conditions),
        current_medications = COALESCE(?, current_medications),
        blood_type = COALESCE(?, blood_type),
        emergency_contact_name = COALESCE(?, emergency_contact_name),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone),
        updated_at = datetime('now')
       WHERE user_id = ?`
    ).run(
      allergies ? JSON.stringify(allergies) : null,
      chronicConditions ? JSON.stringify(chronicConditions) : null,
      currentMedications ? JSON.stringify(currentMedications) : null,
      bloodType || null,
      emergencyContactName || null,
      emergencyContactPhone || null,
      req.userId
    );

    const healthProfile = await db.prepare('SELECT * FROM user_health_profile WHERE user_id = ?').get(req.userId);
    res.json({ healthProfile });
  }
);

module.exports = router;
