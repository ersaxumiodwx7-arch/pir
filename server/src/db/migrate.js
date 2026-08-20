import db from './index.js';

const migrations = [
  `CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Untitled Form',
    description TEXT DEFAULT '',
    logo_url TEXT,
    unique_slug TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    allow_resubmit INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS form_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    placeholder TEXT DEFAULT '',
    required INTEGER NOT NULL DEFAULT 0,
    field_order INTEGER NOT NULL DEFAULT 0,
    options TEXT DEFAULT '[]',
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id INTEGER NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    client_fingerprint TEXT,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS submission_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    field_id INTEGER NOT NULL,
    value TEXT DEFAULT '',
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON form_fields(form_id)`,
  `CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id)`,
  `CREATE INDEX IF NOT EXISTS idx_submission_answers_submission_id ON submission_answers(submission_id)`,
];

export function runMigrations() {
  for (const sql of migrations) {
    db.exec(sql);
  }
  console.log('Migrations completed.');
}

import { pathToFileURL } from 'url';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMigrations();
}
