const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const ensureWritableDirectory = require('../utils/ensureWritableDirectory');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/medora.db');
const databaseUrl = process.env.TURSO_DATABASE_URL || pathToFileURL(path.resolve(DB_PATH)).href;

if (process.env.NODE_ENV === 'production' && !process.env.TURSO_DATABASE_URL) {
  throw new Error('Configure TURSO_DATABASE_URL before starting Medora in production.');
}
if (process.env.NODE_ENV === 'production' && databaseUrl.startsWith('file:')) {
  throw new Error('Production deployments must use a remote Turso database, not a local SQLite file.');
}

if (!process.env.TURSO_DATABASE_URL) {
  ensureWritableDirectory(path.dirname(DB_PATH), 'Database');
}

if (process.env.TURSO_AUTH_TOKEN && !process.env.TURSO_DATABASE_URL) {
  throw new Error('TURSO_DATABASE_URL is required when TURSO_AUTH_TOKEN is set');
}
if (process.env.TURSO_DATABASE_URL && !databaseUrl.startsWith('file:') && !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('TURSO_AUTH_TOKEN is required for a remote Turso database');
}

const client = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = {
  prepare(sql) {
    return {
      async get(...args) {
        const result = await client.execute({ sql, args });
        return result.rows[0];
      },
      async all(...args) {
        const result = await client.execute({ sql, args });
        return result.rows;
      },
      async run(...args) {
        const result = await client.execute({ sql, args });
        return { changes: Number(result.rowsAffected), lastInsertRowid: result.lastInsertRowid };
      },
    };
  },
  exec(sql) {
    return client.executeMultiple(sql);
  },
  batch(statements) {
    return client.batch(
      statements.map(({ sql, args }) => ({ sql, args })),
      'write'
    );
  },
};

async function ensureColumn(table, column, definition) {
  const tableExists = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  if (!tableExists) return;

  const columns = await db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[migrate] added ${table}.${column}`);
  }
}

async function initializeDatabase() {
  await db.exec('PRAGMA foreign_keys = ON;');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const statements = schema.split(';').map((statement) => statement.trim()).filter(Boolean);
  const indexes = statements.filter((statement) => /\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(statement));
  const schemaStatements = statements.filter((statement) => !/\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(statement));
  await db.exec(`${schemaStatements.join(';\n')};`);

  await ensureColumn('conversations', 'project_id', 'TEXT REFERENCES projects(id) ON DELETE SET NULL');
  await ensureColumn('users', 'terms_accepted_at', 'TEXT');
  await ensureColumn('users', 'health_data_consent_at', 'TEXT');
  await ensureColumn('users', 'cookie_notice_accepted_at', 'TEXT');
  await ensureColumn('users', 'consent_policy_version', 'TEXT');
  await ensureColumn('doctors', 'is_verified', 'INTEGER NOT NULL DEFAULT 0');
  if (indexes.length) await db.exec(`${indexes.join(';\n')};`);
}

db.initialize = initializeDatabase;
db.close = () => client.close();

module.exports = db;
