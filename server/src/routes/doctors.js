const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Search/list doctors, optionally filtered by city or specialty
router.get('/', (req, res) => {
  const { city, specialty } = req.query;
  let query = 'SELECT id, full_name, specialty, clinic_name, city, region, address, phone, latitude, longitude, accepts_referrals FROM doctors WHERE is_verified = 1';
  const params = [];

  if (city) {
    query += ' AND city = ?';
    params.push(city);
  }
  if (specialty) {
    query += ' AND specialty = ?';
    params.push(specialty);
  }
  query += ' ORDER BY city, specialty, clinic_name, full_name';

  const doctors = db.prepare(query).all(...params);
  res.json({ doctors });
});

router.get('/specialties', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT specialty FROM doctors WHERE is_verified = 1 ORDER BY specialty').all();
  res.json({ specialties: rows.map((r) => r.specialty) });
});

module.exports = router;
