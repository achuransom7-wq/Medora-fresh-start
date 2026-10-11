const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const ensureWritableDirectory = require('../utils/ensureWritableDirectory');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/medora.db');

const dataDir = path.dirname(DB_PATH);
ensureWritableDirectory(dataDir, 'Database');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Lightweight migrations for columns added after initial release ---
// SQLite has no "ADD COLUMN IF NOT EXISTS", so we check PRAGMA table_info first.
// Safe to run whenever the target table exists: a no-op once the column is present.
function ensureColumn(table, column, definition) {
  const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(table);
  if (!tableExists) return;
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((c) => c.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[migrate] added ${table}.${column}`);
  }
}

// Run schema on boot (idempotent, safe with IF NOT EXISTS). On a database created
// before a given release, a later CREATE INDEX in schema.sql can reference a column
// (e.g. conversations.project_id) that doesn't exist yet on an old conversations
// table. If that happens, run the column migration (the referenced table, e.g.
// "projects", will already have been created earlier in this same exec) and replay
// the schema — CREATE TABLE/INDEX IF NOT EXISTS make the replay a safe no-op for
// everything that already succeeded.
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
try {
  db.exec(schema);
} catch (err) {
  console.log(`[migrate] initial schema pass hit "${err.message}", attempting column migration + retry`);
  ensureColumn('conversations', 'project_id', "TEXT REFERENCES projects(id) ON DELETE SET NULL");
  db.exec(schema);
}

// Always double-check known post-release columns even when the first pass succeeded
// (covers the case where the column already existed under a different constraint set).
ensureColumn('conversations', 'project_id', "TEXT REFERENCES projects(id) ON DELETE SET NULL");
ensureColumn('users', 'terms_accepted_at', 'TEXT');
ensureColumn('users', 'health_data_consent_at', 'TEXT');
ensureColumn('users', 'cookie_notice_accepted_at', 'TEXT');
ensureColumn('users', 'consent_policy_version', 'TEXT');
ensureColumn('doctors', 'is_verified', 'INTEGER NOT NULL DEFAULT 0');

module.exports = db;
