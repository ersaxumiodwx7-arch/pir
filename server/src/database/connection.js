require('dotenv').config();

// Default to SQLite if no DATABASE_URL or if it starts with 'sqlite'
const dbUrl = process.env.DATABASE_URL || 'sqlite:./formflow.db';

let db;

if (!dbUrl.startsWith('postgres')) {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = dbUrl.replace('sqlite:', '');
  db = new sqlite3.Database(dbPath);

  // Self-healing schema: databases created by older versions of this project
  // may be missing columns the current code expects (they were added later by
  // migrate-add-form-features.js). ALTER TABLE now if needed - sqlite3 queues
  // these statements before any later queries, so the schema is current by the
  // time the controllers run.
  db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'forms'", (err, rows) => {
      if (err || !rows || rows.length === 0) return; // no forms table yet - run a migration first

      const ensureColumn = (table, column, definition) => {
        db.all(`PRAGMA table_info(${table})`, (pragmaErr, cols) => {
          if (pragmaErr || (cols || []).some((c) => c.name === column)) return;
          db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (alterErr) => {
            if (alterErr) {
              console.error(`Schema migration failed (${table}.${column}):`, alterErr.message);
            } else {
              console.log(`Schema migration: added ${table}.${column}`);
            }
          });
        });
      };

      ensureColumn('forms', 'ending_description', 'TEXT');
      ensureColumn('forms', 'background_color', 'TEXT DEFAULT "#ffffff"');
      ensureColumn('forms', 'background_image', 'TEXT');

      // Ensure deposit_requests has client_deposit_method_id
      db.all("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'deposit_requests'", (drErr, drRows) => {
        if (drErr || !drRows || drRows.length === 0) return;
        ensureColumn('deposit_requests', 'client_deposit_method_id', 'INTEGER');
      });
    });
  });
  
  // Wrapper to make SQLite compatible with pg-like interface
  module.exports = {
    query: (text, params) => {
      return new Promise((resolve, reject) => {
        // Convert PostgreSQL parameter placeholders ($1, $2) to SQLite placeholders (?, ?)
        let sql = text;
        const cleanParams = params || [];
        if (cleanParams.length > 0) {
          sql = text.replace(/\$(\d+)/g, '?');
        }

        const upperSql = sql.trim().toUpperCase();
        const isSelect = upperSql.startsWith('SELECT') || upperSql.startsWith('PRAGMA');
        const hasReturning = upperSql.includes('RETURNING');

        if (isSelect) {
          db.all(sql, cleanParams, (err, rows) => {
            if (err) reject(err);
            else resolve({ rows: rows || [] });
          });
        } else if (hasReturning) {
          // INSERT/UPDATE with RETURNING — use db.all so SQLite returns the row
          db.all(sql, cleanParams, (err, rows) => {
            if (err) reject(err);
            else resolve({ rows: rows || [] });
          });
        } else {
          // DDL / simple INSERT / UPDATE / DELETE — use db.run
          db.run(sql, cleanParams, function (err) {
            if (err) return reject(err);
            resolve({ rows: [], changes: this.changes, lastID: this.lastID });
          });
        }
      });
    },
    connect: () => Promise.resolve(),
    end: () => {
      return new Promise((resolve) => {
        db.close(() => resolve());
      });
    }
  };
} else {
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  module.exports = db;
}
