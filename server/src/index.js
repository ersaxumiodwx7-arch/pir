const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Run all schema migrations on startup
const { migrateClientSchema } = require('./database/migrate-clients');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  const pool = require('./database/connection');

  // Create base tables if they don't exist (SQLite-compatible)
  const baseSchema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      logo_url TEXT,
      unique_slug TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      ending_description TEXT,
      background_color TEXT DEFAULT '#ffffff',
      background_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS form_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      placeholder TEXT,
      required INTEGER DEFAULT 0,
      order_index INTEGER NOT NULL,
      options TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER NOT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS submission_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      field_id INTEGER NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_forms_unique_slug ON forms(unique_slug);
    CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON form_fields(form_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);
    CREATE INDEX IF NOT EXISTS idx_submission_answers_submission_id ON submission_answers(submission_id);
    CREATE INDEX IF NOT EXISTS idx_submission_answers_field_id ON submission_answers(field_id);
  `;

  const statements = baseSchema.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.error('Base migration warning:', err.message);
      }
    }
  }
  console.log('Base tables migration completed');

  // Run client portal migrations
  migrateClientSchema();

  // Ensure username column exists (migration for existing databases)
  try {
    await pool.query('ALTER TABLE users ADD COLUMN username TEXT');
    console.log('Added username column to users table');
  } catch (err) {
    // Column already exists, ignore
  }

  // Seed admin user if no users exist
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(result.rows[0].count);
    if (count === 0) {
      const adminUsername = process.env.ADMIN_USERNAME || 'pirates';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Blade1528';
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING *',
        [adminUsername + '@admin.local', adminUsername, passwordHash]
      );
      console.log(`Admin user created: ${adminUsername}`);
    } else {
      // Ensure the admin user has the correct credentials
      const adminUsername = process.env.ADMIN_USERNAME || 'pirates';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Blade1528';
      const existingAdmin = await pool.query('SELECT * FROM users WHERE username = $1', [adminUsername]);
      if (existingAdmin.rows.length === 0) {
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await pool.query(
          'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING *',
          [adminUsername + '@admin.local', adminUsername, passwordHash]
        );
        console.log(`Admin user created: ${adminUsername}`);
      } else {
        // Update password in case it changed
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [passwordHash, adminUsername]);
        console.log(`Admin user updated: ${adminUsername}`);
      }
    }
  } catch (err) {
    console.error('Admin seed error:', err.message);
  }
}

// Ensure JWT_SECRET is set (fallback for environments where it's not configured)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'pirates-jwt-secret-fallback-2024';
  console.log('WARNING: JWT_SECRET not set, using fallback secret');
}

// Debug endpoint - check admin user (remove in production later)
app.get('/api/debug/admin', async (req, res) => {
  try {
    const pool = require('./database/connection');
    const result = await pool.query('SELECT id, email, username, password_hash FROM users');
    const bcrypt = require('bcryptjs');
    const testPassword = process.env.ADMIN_PASSWORD || 'Blade1528';
    const users = result.rows.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      hashPrefix: u.password_hash ? u.password_hash.substring(0, 10) : null,
      passwordMatches: u.password_hash ? bcrypt.compareSync(testPassword, u.password_hash) : false
    }));
    res.json({
      userCount: users.length,
      users,
      envAdminUser: process.env.ADMIN_USERNAME || 'pirates',
      envAdminPass: process.env.ADMIN_PASSWORD ? 'SET (overriding Blade1528)' : 'NOT SET (using Blade1528)',
      envJwt: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes - Existing
app.use('/api/auth', require('./routes/auth'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/fields', require('./routes/fields'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/upload', require('./routes/upload'));

// Routes - Client Portal
app.use('/api/admin/clients', require('./routes/adminClients'));
app.use('/api/admin/agents', require('./routes/agents'));
app.use('/api/admin/deposits', require('./routes/adminDeposits'));
app.use('/api/client', require('./routes/clientPortal'));
app.use('/api/client/deposits', require('./routes/clientDeposits'));

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database FIRST, then start the server
initDatabase().then(() => {
  console.log('Database initialized successfully');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Database initialization failed:', err.message);
  // Still start the server even if init fails - some routes may work
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (with DB init errors)`);
  });
});
