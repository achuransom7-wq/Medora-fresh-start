const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const fileStorage = require('../services/fileStorage');
const { serializeUser, serializeHealthProfile } = require('../utils/serializeUser');

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

const USER_COLUMNS =
  'id, full_name, email, phone, date_of_birth, sex, city, region, terms_accepted_at, health_data_consent_at, cookie_notice_accepted_at';
const BLOOD_TYPES = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PHONE_RE = /^[+()\d\s.-]{0,24}$/;

async function loadProfile(userId) {
  const user = await db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(userId);
  if (!user) return null;
  const healthRow = await db.prepare('SELECT * FROM user_health_profile WHERE user_id = ?').get(userId);
  return { user: serializeUser(user), healthProfile: serializeHealthProfile(healthRow) };
}

router.get('/me', async (req, res) => {
  const profile = await loadProfile(req.userId);
  if (!profile) return res.status(404).json({ error: 'User not found' });
  res.json(profile);
});

const listField = (name) =>
  body(name)
    .optional()
    .isArray({ max: 30 })
    .withMessage(`${name} must be a list of up to 30 items`)
    .bail()
    .custom((items) => items.every((item) => typeof item === 'string' && item.trim().length <= 100))
    .withMessage(`Each ${name} entry must be 100 characters or fewer`);

// Saves personal details and the health profile together, so a failure never leaves half a profile saved.
router.put(
  '/me/profile',
  [
    body('fullName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Please enter your full name (at least 2 characters)'),
    body('phone').optional().trim().matches(PHONE_RE).withMessage('Phone number can only contain digits, spaces, + ( ) . -'),
    body('city').optional().trim().isLength({ max: 100 }).withMessage('City is too long'),
    body('region').optional().trim().isLength({ max: 100 }).withMessage('Region is too long'),
    body('dateOfBirth')
      .optional({ values: 'falsy' })
      .isISO8601({ strict: true })
      .withMessage('Date of birth must be a valid date')
      .bail()
      .custom((value) => new Date(value) <= new Date() && new Date(value).getFullYear() >= 1900)
      .withMessage('Date of birth must be in the past'),
    body('sex').optional().isIn(['', 'male', 'female', 'other']).withMessage('Choose a valid option for sex'),
    listField('allergies'),
    listField('chronicConditions'),
    listField('currentMedications'),
    body('bloodType').optional().isIn(BLOOD_TYPES).withMessage('Choose a valid blood type'),
    body('emergencyContactName').optional().trim().isLength({ max: 100 }).withMessage('Emergency contact name is too long'),
    body('emergencyContactPhone').optional().trim().matches(PHONE_RE).withMessage('Emergency contact phone can only contain digits, spaces, + ( ) . -'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const b = req.body;
    const clean = (list) => {
      const seen = new Set();
      const items = (list || []).map((item) => item.trim()).filter((item) => {
        const key = item.toLowerCase();
        if (!item || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return JSON.stringify(items);
    };

    const userFields = [];
    const userValues = [];
    const userMap = { fullName: 'full_name', phone: 'phone', city: 'city', region: 'region', dateOfBirth: 'date_of_birth', sex: 'sex' };
    for (const [key, column] of Object.entries(userMap)) {
      if (b[key] !== undefined) {
        userFields.push(`${column} = ?`);
        userValues.push(typeof b[key] === 'string' ? b[key].trim() || null : b[key]);
      }
    }

    const statements = [];
    if (userFields.length) {
      statements.push({
        sql: `UPDATE users SET ${userFields.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
        args: [...userValues, req.userId],
      });
    }

    // Upsert so accounts without a health row still save, and empty values really clear a field.
    statements.push({ sql: 'INSERT OR IGNORE INTO user_health_profile (user_id) VALUES (?)', args: [req.userId] });
    const healthFields = [];
    const healthValues = [];
    const listMap = { allergies: 'allergies', chronicConditions: 'chronic_conditions', currentMedications: 'current_medications' };
    for (const [key, column] of Object.entries(listMap)) {
      if (b[key] !== undefined) {
        healthFields.push(`${column} = ?`);
        healthValues.push(clean(b[key]));
      }
    }
    const textMap = { bloodType: 'blood_type', emergencyContactName: 'emergency_contact_name', emergencyContactPhone: 'emergency_contact_phone' };
    for (const [key, column] of Object.entries(textMap)) {
      if (b[key] !== undefined) {
        healthFields.push(`${column} = ?`);
        healthValues.push(String(b[key]).trim() || null);
      }
    }
    if (healthFields.length) {
      statements.push({
        sql: `UPDATE user_health_profile SET ${healthFields.join(', ')}, updated_at = datetime('now') WHERE user_id = ?`,
        args: [...healthValues, req.userId],
      });
    }

    await db.batch(statements);
    res.json(await loadProfile(req.userId));
  }
);

module.exports = router;
