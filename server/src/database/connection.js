require('dotenv').config();

// Default to SQLite if no DATABASE_URL or if it starts with 'sqlite'
const dbUrl = process.env.DATABASE_URL || 'sqlite:./formflow.db';
const isPostgres = dbUrl.startsWith('postgres');

let db;

if (!isPostgres) {
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
    getPool: () => db,
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
  // PostgreSQL mode: data lives in a managed database (Railway/Render/Neon/
  // Supabase) and SURVIVES REDEPLOYS. Statements arrive written in the app's
  // SQLite style; translateSql rewrites the SQLite-only constructs.
  const { Pool } = require('pg');
  const { translateSql } = require('./dialect');

  // NUMERIC/DECIMAL columns come back as strings by default, which would
  // silently break balance arithmetic ("100" + 50 === "10050"). Parse as float.
  const pgTypes = require('pg').types;
  pgTypes.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

  // Managed hosts: public URLs need TLS, internal ones (e.g. Railway's
  // *.railway.internal) reject it. Auto-detect with env overrides.
  let ssl;
  if (process.env.PGSSL_DISABLE === '1') {
    ssl = false;
  } else if (process.env.PGSSL_REQUIRE === '1') {
    ssl = { rejectUnauthorized: false };
  } else {
    const host = (() => {
      try { return new URL(dbUrl).hostname; } catch (e) { return ''; }
    })();
    const internal = /(^|\.)(railway\.internal|internal|localhost|local)$/i.test(host) ||
      /^(127\.0\.0\.1|::1|10\.|192\.168\.)/.test(host);
    ssl = internal ? false : { rejectUnauthorized: false };
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl
  });

  module.exports = {
    getPool: () => pool,
    query: async (text, params) => {
      const sql = translateSql(text);
      // pg throws on undefined params; the app treats them as NULL
      const cleanParams = (params || []).map((p) => (p === undefined ? null : p));
      const result = await pool.query(sql, cleanParams);

      // Emulate sqlite3's lastID for INSERTs that use RETURNING. Callers that
      // insert without RETURNING don't read lastID (verified across the app).
      const lastID = result.command === 'INSERT' && result.rows[0]
        ? (result.rows[0].id ?? null)
        : null;

      return {
        rows: result.rows || [],
        rowCount: result.rowCount,
        changes: result.rowCount,
        lastID
      };
    },
    connect: () => pool.connect().then((c) => c.release()),
    end: () => pool.end(),
    __pgPool: pool
  };
}
