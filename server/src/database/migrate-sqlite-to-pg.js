/**
 * One-time data migration: local SQLite -> PostgreSQL.
 *
 * Run this ONCE to carry existing production data (clients, admins,
 * transactions, notifications, ...) into the managed Postgres database.
 * Afterwards the server runs with DATABASE_URL=postgres://... and data
 * survives every redeploy.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node src/database/migrate-sqlite-to-pg.js [sqlite-file]
 *
 *   - DATABASE_URL  target Postgres connection string (required)
 *   - positional    source SQLite file (default: ./formflow.db)
 *
 * Safe to re-run: rows are inserted with ON CONFLICT (id) DO NOTHING and
 * sequences are re-synced to the max inserted id each run.
 */

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const sqliteFile = process.argv[2] || './formflow.db';
const pgUrl = process.env.DATABASE_URL;

if (!pgUrl || !pgUrl.startsWith('postgres')) {
  console.error('ERROR: set DATABASE_URL to your Postgres connection string, e.g.');
  console.error('  DATABASE_URL="postgres://user:pass@host:5432/db" node src/database/migrate-sqlite-to-pg.js');
  process.exit(1);
}
if (!fs.existsSync(sqliteFile)) {
  console.error(`ERROR: SQLite file not found: ${sqliteFile}`);
  process.exit(1);
}

// Insert order respects foreign-key-ish dependencies (parents first).
const TABLES = [
  'users',
  'admins',
  'forms',
  'form_fields',
  'submissions',
  'submission_answers',
  'clients',
  'agents',
  'deposit_methods',
  'client_deposit_methods',
  'deposit_requests',
  'client_notifications',
  'client_transactions',
  'client_documents',
  'client_activity_logs',
  'client_password_resets'
];

function readRows(db, table) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${table}`, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function sqliteColumns(db, table) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, cols) =>
      err ? reject(err) : resolve((cols || []).map((c) => c.name))
    );
  });
}

function sqliteTables(db) {
  return new Promise((resolve, reject) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) =>
      err ? reject(err) : resolve((rows || []).map((r) => r.name))
    );
  });
}

async function main() {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: pgUrl,
    ssl: process.env.PGSSL_DISABLE === '1' ? false : { rejectUnauthorized: false }
  });

  const db = new sqlite3.Database(sqliteFile, sqlite3.OPEN_READONLY);
  const sourceTables = await sqliteTables(db);

  let totalCopied = 0;
  const summary = [];

  for (const table of TABLES) {
    if (!sourceTables.includes(table)) {
      summary.push(`  - ${table}: not present in source, skipped`);
      continue;
    }

    const cols = await sqliteColumns(db, table);
    if (cols.length === 0 || !cols.includes('id')) {
      summary.push(`  - ${table}: no id column, skipped`);
      continue;
    }

    const rows = await readRows(db, table);
    let copied = 0;

    for (const row of rows) {
      const values = cols.map((c) => (row[c] === undefined ? null : row[c]));
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      try {
        const res = await pool.query(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
          values
        );
        copied += res.rowCount || 0;
      } catch (e) {
        console.error(`  ! ${table} row id=${row.id}: ${e.message.split('\n')[0]}`);
      }
    }
    totalCopied += copied;

    // Re-sync the identity sequence so future inserts don't collide
    if (rows.length > 0) {
      const maxId = Math.max(...rows.map((r) => Number(r.id) || 0));
      try {
        await pool.query(
          `SELECT setval(pg_get_serial_sequence($1, 'id'), $2, true)`,
          [table, maxId]
        );
      } catch (e) {
        console.error(`  ! sequence sync failed for ${table}: ${e.message.split('\n')[0]}`);
      }
    }

    summary.push(`  - ${table}: ${copied}/${rows.length} rows copied`);
  }

  db.close();
  await pool.end();

  console.log('\n=== Migration summary ===');
  summary.forEach((l) => console.log(l));
  console.log(`\nDone. ${totalCopied} rows migrated from ${path.resolve(sqliteFile)}`);
  console.log('Next: deploy the server with DATABASE_URL set to the same Postgres URL.');
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
