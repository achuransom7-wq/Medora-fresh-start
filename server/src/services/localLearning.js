/**
 * Medora Local Learning
 * ---------------------
 * A genuine (if simple and transparent) self-learning loop, fully local:
 *
 *  1. Every differential result is logged to the `local_agent_feedback` table
 *     (created here if it doesn't exist) along with the symptoms matched.
 *  2. When a patient confirms or corrects a suggestion (via the new
 *     /api/local-agent/feedback endpoint — see routes/localAgentFeedback.js),
 *     that's recorded too.
 *  3. On each request, confirmed matches get a small positive multiplier on
 *     that disease's score; corrected-away matches get a small negative one.
 *     Multipliers are clamped so no single disease can be learned into
 *     dominating or disappearing entirely — this is a nudge, not an override.
 *
 * This is intentionally conservative: it reweights among the same 41
 * reviewed diseases, it never invents new disease-symptom associations, and
 * it never affects red-flag/triage logic. Nothing here calls out to the
 * internet — it's just SQLite reads/writes on your own machine.
 */

const { randomUUID } = require('crypto');
const db = require('../db');

const MIN_MULTIPLIER = 0.6;
const MAX_MULTIPLIER = 1.5;
const STEP = 0.05;

function ensureTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_agent_feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      conversation_id TEXT,
      disease_name TEXT NOT NULL,
      matched_symptoms TEXT,
      outcome TEXT NOT NULL CHECK(outcome IN ('shown', 'confirmed', 'corrected')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_local_feedback_disease ON local_agent_feedback(disease_name, outcome);
  `);
}
ensureTable();

/** Log that a candidate was shown to the patient (called automatically by localAI.js) */
function logShown({ userId, conversationId, candidates }) {
  try {
    const insert = db.prepare(
      `INSERT INTO local_agent_feedback (id, user_id, conversation_id, disease_name, matched_symptoms, outcome)
       VALUES (?, ?, ?, ?, ?, 'shown')`
    );
    for (const c of candidates) {
      insert.run(randomUUID(), userId || null, conversationId || null, c.name, JSON.stringify(c.matchedSymptoms));
    }
  } catch (err) {
    console.warn('[localLearning] failed to log shown candidates (non-fatal):', err.message);
  }
}

/**
 * Record explicit feedback from the patient: "yes that sounds right" (confirmed)
 * or "no, that's not it" (corrected). Call this from a feedback endpoint/UI
 * button if you wire one up — entirely optional, the agent works fine without it.
 */
function recordFeedback({ userId, conversationId, diseaseName, outcome }) {
  if (!['confirmed', 'corrected'].includes(outcome)) throw new Error('outcome must be confirmed or corrected');
  db.prepare(
    `INSERT INTO local_agent_feedback (id, user_id, conversation_id, disease_name, matched_symptoms, outcome)
     VALUES (?, ?, ?, ?, NULL, ?)`
  ).run(randomUUID(), userId || null, conversationId || null, diseaseName, outcome);
}

/**
 * Get a scoring multiplier for a disease based on accumulated feedback.
 * Confirmed +STEP, corrected -STEP, clamped to [MIN_MULTIPLIER, MAX_MULTIPLIER].
 * Cached per-process for a few minutes to avoid a DB hit on every scoring call.
 */
let cache = null;
let cacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function buildMultiplierMap() {
  const rows = db
    .prepare(
      `SELECT disease_name,
              SUM(CASE WHEN outcome = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
              SUM(CASE WHEN outcome = 'corrected' THEN 1 ELSE 0 END) as corrected
       FROM local_agent_feedback
       WHERE outcome IN ('confirmed', 'corrected')
       GROUP BY disease_name`
    )
    .all();

  const map = new Map();
  for (const row of rows) {
    const net = row.confirmed - row.corrected;
    const multiplier = Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, 1 + net * STEP));
    map.set(row.disease_name, multiplier);
  }
  return map;
}

function getLearningMultiplier(diseaseName) {
  const now = Date.now();
  if (!cache || now - cacheAt > CACHE_TTL_MS) {
    cache = buildMultiplierMap();
    cacheAt = now;
  }
  return cache.get(diseaseName) ?? 1;
}

/** Basic transparency: see what the agent has "learned" so far, per disease */
function getLearningStats() {
  return db
    .prepare(
      `SELECT disease_name,
              SUM(CASE WHEN outcome = 'shown' THEN 1 ELSE 0 END) as times_shown,
              SUM(CASE WHEN outcome = 'confirmed' THEN 1 ELSE 0 END) as times_confirmed,
              SUM(CASE WHEN outcome = 'corrected' THEN 1 ELSE 0 END) as times_corrected
       FROM local_agent_feedback
       GROUP BY disease_name
       ORDER BY times_shown DESC`
    )
    .all();
}

module.exports = { logShown, recordFeedback, getLearningMultiplier, getLearningStats };
