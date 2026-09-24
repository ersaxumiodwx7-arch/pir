/**
 * SQL dialect layer.
 *
 * The codebase was written against SQLite but can now run on PostgreSQL
 * (Railway/Render/Neon/Supabase managed DBs) so data survives redeploys.
 * Runtime SQL stays written in the SQLite style ($1 placeholders are
 * already shared by both dialects); this layer rewrites the few
 * SQLite-only constructs into their Postgres equivalents.
 *
 * isPostgres()      - true when DATABASE_URL points at Postgres
 * translateSql()    - rewrite a SQLite-style statement for Postgres
 * tableColumns()    - dialect-agnostic "describe table" helper
 * tableExists()     - dialect-agnostic "does table exist" helper
 */

const isPostgres = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  return dbUrl.startsWith('postgres');
};

/**
 * Translate a SQLite-flavoured statement for PostgreSQL.
 * Non-Postgres deployments get the statement unchanged.
 */
function translateSql(sql) {
  if (!isPostgres()) return sql;

  let out = sql;

  // Table existence / schema introspection via sqlite_master
  out = out.replace(
    /SELECT\s+name\s+FROM\s+sqlite_master\s+WHERE\s+type\s*=\s*'table'\s+AND\s+name\s*=\s*'([^']+)'/gi,
    (m, table) => `SELECT table_name AS name FROM information_schema.tables WHERE table_name = '${table}'`
  );

  // INTEGER PRIMARY KEY AUTOINCREMENT -> BIGSERIAL
  out = out.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'BIGSERIAL PRIMARY KEY');

  // SQLite DATE/TIME literals -> Postgres functions
  out = out.replace(/\bDATETIME\b/gi, 'TIMESTAMP');
  out = out.replace(/datetime\(\s*'now'\s*\)/gi, 'CURRENT_TIMESTAMP');
  out = out.replace(/date\(\s*'now'\s*\)/gi, 'CURRENT_DATE');

  // INSERT OR IGNORE -> ON CONFLICT DO NOTHING
  if (/insert\s+or\s+ignore/i.test(out)) {
    out = out.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    if (!/ON\s+CONFLICT/i.test(out)) {
      out = out.replace(/;\s*$/, '') + ' ON CONFLICT DO NOTHING';
    }
  }

  // LIKE is case-sensitive on Postgres but case-insensitive on SQLite.
  // Search features relied on SQLite semantics, so switch to ILIKE.
  out = out.replace(/\bLIKE\b/g, 'ILIKE');

  return out;
}

/**
 * Columns of a table, dialect-agnostic.
 * Returns { rows: [{ name: '...' }, ...] } (SQLite PRAGMA-style shape).
 */
async function tableColumns(table) {
  // Use the wrapper's query (handles PRAGMA on SQLite, passes
  // information_schema through translateSql on Postgres).
  const { query } = require('./connection');
  if (isPostgres()) {
    return query(
      `SELECT column_name AS name FROM information_schema.columns WHERE table_name = $1`,
      [table]
    );
  }
  return query(`PRAGMA table_info(${table})`);
}

/**
 * Does a table exist? Dialect-agnostic, returns boolean.
 */
async function tableExists(table) {
  const { query } = require('./connection');
  let res;
  if (isPostgres()) {
    res = await query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = $1`,
      [table]
    );
  } else {
    res = await query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
    );
  }
  return (res.rows || []).length > 0;
}

module.exports = { isPostgres, translateSql, tableColumns, tableExists };
