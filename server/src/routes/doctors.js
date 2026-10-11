const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Search/list doctors, optionally filtered by city or specialty
router.get('/', (req, res) => {
  const { city, specialty } = req.query;
  let query = 'SELECT * FROM doctors WHERE 1=1';
  const params = [];

  if (city) {
    query += ' AND city = ?';
    params.push(city);
  }
  if (specialty) {
    query += ' AND specialty = ?';
    params.push(specialty);
  }
  query += ' ORDER BY rating DESC';

  const doctors = db.prepare(query).all(...params);
  res.json({ doctors });
});

router.get('/specialties', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT specialty FROM doctors ORDER BY specialty').all();
  res.json({ specialties: rows.map((r) => r.specialty) });
});

module.exports = router;
