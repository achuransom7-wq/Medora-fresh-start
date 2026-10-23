/** One consistent user shape for every endpoint (login, register, session restore, profile). */
function serializeUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone || '',
    city: row.city || '',
    region: row.region || '',
    dateOfBirth: row.date_of_birth || '',
    sex: row.sex || '',
    terms_accepted_at: row.terms_accepted_at || null,
    health_data_consent_at: row.health_data_consent_at || null,
    cookie_notice_accepted_at: row.cookie_notice_accepted_at || null,
  };
}

function parseList(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function serializeHealthProfile(row) {
  return {
    allergies: parseList(row?.allergies),
    chronicConditions: parseList(row?.chronic_conditions),
    currentMedications: parseList(row?.current_medications),
    bloodType: row?.blood_type || '',
    emergencyContactName: row?.emergency_contact_name || '',
    emergencyContactPhone: row?.emergency_contact_phone || '',
  };
}

module.exports = { serializeUser, serializeHealthProfile };
