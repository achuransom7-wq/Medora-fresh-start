const db = require('../db');

/**
 * Match doctors for a referral based on city and optional specialty hint.
 * Falls back to General Practice / Emergency Medicine if no specialty match.
 */
async function matchDoctors({ city, specialty, severity, limit = 5 }) {
  let query = `SELECT id, full_name, specialty, clinic_name, city, region, address, phone, latitude, longitude, accepts_referrals FROM doctors WHERE is_verified = 1 AND accepts_referrals = 1`;
  const params = [];

  if (city) {
    query += ` AND city = ?`;
    params.push(city);
  }

  if (severity === 'urgent') {
    query += ` AND specialty = 'Emergency Medicine'`;
  } else if (specialty) {
    query += ` AND specialty = ?`;
    params.push(specialty);
  }

  query += ` ORDER BY city, specialty, clinic_name, full_name LIMIT ?`;
  params.push(limit);

  let results = await db.prepare(query).all(...params);

  // Fallback: if no specialty match, widen to General Practice in the same city
  if (results.length === 0 && city) {
    results = await db
      .prepare(`SELECT id, full_name, specialty, clinic_name, city, region, address, phone, latitude, longitude, accepts_referrals FROM doctors WHERE is_verified = 1 AND accepts_referrals = 1 AND city = ? AND specialty = 'General Practice' ORDER BY clinic_name, full_name LIMIT ?`)
      .all(city, limit);
  }

  return results;
}

/** Simple keyword-based specialty inference from conversation text */
function inferSpecialty(text) {
  const t = text.toLowerCase();
  if (/pregnan|obstetric|gynec/.test(t)) return 'Obstetrics & Gynecology';
  if (/child|infant|baby|kid/.test(t)) return 'Pediatrics';
  if (/skin|rash|acne|eczema/.test(t)) return 'Dermatology';
  if (/heart|chest pain|palpitation|cardiac/.test(t)) return 'Cardiology';
  if (/anxious|depress|mental|suicidal|stress/.test(t)) return 'Psychiatry';
  return 'General Practice';
}

module.exports = { matchDoctors, inferSpecialty };
