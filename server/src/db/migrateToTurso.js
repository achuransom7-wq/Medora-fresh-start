const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
require('dotenv').config();

async function migrate() {
  const databaseUrl = process.env.TURSO_DATABASE_URL;
  if (!databaseUrl) throw new Error('Set TURSO_DATABASE_URL to the destination Turso database URL.');
  if (!process.env.TURSO_AUTH_TOKEN && !databaseUrl.startsWith('file:')) {
    throw new Error('Set TURSO_AUTH_TOKEN for a remote Turso database.');
  }

  const sourcePath = path.resolve(process.env.DB_PATH || path.join(__dirname, '../../data/medora.db'));
  if (!fs.existsSync(sourcePath)) throw new Error(`Local SQLite database not found at ${sourcePath}`);
  const source = createClient({ url: pathToFileURL(sourcePath).href });
  const destination = createClient({ url: databaseUrl, authToken: process.env.TURSO_AUTH_TOKEN });
  const db = require('./index');

  try {
    await db.initialize();
    const tableRows = await source.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid"
    );
    const preferredOrder = [
      'users',
      'user_health_profile',
      'projects',
      'doctors',
      'conversations',
      'messages',
      'referrals',
      'refresh_tokens',
      'attachments',
      'memories',
      'vitals_logs',
      'user_preferences',
      'research_reports',
      'local_agent_feedback',
    ];
    const tables = tableRows.rows.map((row) => row.name);
    tables.sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a);
      const bIndex = preferredOrder.indexOf(b);
      return (aIndex < 0 ? preferredOrder.length : aIndex) - (bIndex < 0 ? preferredOrder.length : bIndex);
    });

    for (const table of tables) {
      const escapedTable = `"${table.replace(/"/g, '""')}"`;
      const columns = await source.execute(`PRAGMA table_info(${escapedTable})`);
      const columnNames = columns.rows.map((column) => column.name);
      if (!columnNames.length) continue;

      const rows = await source.execute(`SELECT * FROM ${escapedTable}`);
      const escapedColumns = columnNames.map((column) => `"${column.replace(/"/g, '""')}"`).join(', ');
      const placeholders = columnNames.map(() => '?').join(', ');
      const sql = `INSERT OR IGNORE INTO ${escapedTable} (${escapedColumns}) VALUES (${placeholders})`;

      let inserted = 0;
      for (let offset = 0; offset < rows.rows.length; offset += 50) {
        const batch = rows.rows.slice(offset, offset + 50).map((row) => ({
          sql,
          args: columnNames.map((column) => row[column]),
        }));
        const results = await destination.batch(batch, 'write');
        inserted += results.reduce((count, result) => count + Number(result.rowsAffected), 0);
      }

      console.log(`[migration] inserted ${inserted} of ${rows.rows.length} rows from ${table}`);
    }
  } finally {
    await Promise.all([source.close(), destination.close(), db.close()]);
  }
}

migrate().catch((error) => {
  console.error('[migration] database copy failed:', error);
  process.exitCode = 1;
});
