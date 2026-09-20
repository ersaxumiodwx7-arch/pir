const pool = require('../database/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Ensure users table exists and admin user is seeded
let adminReady = false;
async function ensureAdmin() {
  if (adminReady) return;
  try {
    // Make sure users table exists
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    // Make sure username column exists
    try {
      await pool.query('ALTER TABLE users ADD COLUMN username TEXT');
    } catch (e) { /* already exists */ }
    
    const adminUsername = process.env.ADMIN_USERNAME || 'pirates';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Blade1528';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [adminUsername]);
    if (existing.rows.length === 0) {
      await pool.query('INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3)',
        [adminUsername + '@admin.local', adminUsername, passwordHash]);
      console.log('Admin user created:', adminUsername);
    } else {
      await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [passwordHash, adminUsername]);
      console.log('Admin user updated:', adminUsername);
    }
    adminReady = true;
  } catch (err) {
    console.error('ensureAdmin error:', err.message);
  }
}

// Ensure super admin exists in the `admins` table (multi-admin system)
let superAdminReady = false;
async function ensureSuperAdminRow() {
  if (superAdminReady) return;
  try {
    const superUsername = process.env.ADMIN_USERNAME || 'pirates';
    const superPassword = process.env.ADMIN_PASSWORD || 'Blade1528';
    const passwordHash = await bcrypt.hash(superPassword, 10);
    const existing = await pool.query('SELECT id FROM admins WHERE role = $1', ['super_admin']);
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO admins (username, email, password_hash, role, subscription_expires_at) VALUES ($1, $2, $3, 'super_admin', NULL)`,
        [superUsername, superUsername + '@admin.local', passwordHash]
      );
      console.log('Super admin row created in admins table:', superUsername);
    }
    superAdminReady = true;
  } catch (err) {
    // admins table may not exist yet (migration timing) - will retry next login
    console.error('ensureSuperAdminRow error:', err.message);
  }
}

const login = async (req, res) => {
  try {
    // Always ensure admin exists before login attempt
    await ensureAdmin();
    await ensureSuperAdminRow();
    
    const { email, password } = req.body;

    // Support login by email OR username (use separate params for SQLite compat)
    let result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, email]
    );
    
    console.log('Login attempt for:', email);

    // Auto-heal: admin accounts created in the admins table but missing a users row
    // (e.g. created before mirroring was added) get their user row created on first login
    if (result.rows.length === 0) {
      try {
        const adminRow = await pool.query('SELECT * FROM admins WHERE username = $1', [email]);
        if (adminRow.rows.length > 0 && adminRow.rows[0].username !== (process.env.ADMIN_USERNAME || 'pirates')) {
          const a = adminRow.rows[0];
          // Copy the real password hash set by the super admin at creation time
          await pool.query(
            'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3)',
            [a.email || (a.username + '@admin.local'), a.username, a.password_hash]
          );
          console.log('Auto-healed missing users row for admin:', a.username);
          result = await pool.query('SELECT * FROM users WHERE username = $1', [email]);
        }
      } catch (e) {
        console.error('Admin auto-heal failed:', e.message);
      }
    }

    if (result.rows.length === 0) {
      console.log('Login failed: no user found for', email);
      return res.status(401).json({ error: 'Invalid credentials - user not found' });
    }

    const user = result.rows[0];
    console.log('Login found user:', { id: user.id, username: user.username, email: user.email });
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials - wrong password' });
    }

    // Determine role: super admin = seeded admin user OR a row in admins table
    const superUsername = process.env.ADMIN_USERNAME || 'pirates';
    let role = 'admin';
    let adminId = null;
    if (user.username === superUsername) {
      role = 'super_admin';
    } else {
      try {
        const adminRow = await pool.query('SELECT * FROM admins WHERE username = $1', [user.username]);
        if (adminRow.rows.length > 0) {
          adminId = adminRow.rows[0].id;
          role = adminRow.rows[0].role === 'super_admin' ? 'super_admin' : 'admin';
          // Enforce subscription for normal admins
          if (role !== 'super_admin' && adminRow.rows[0].subscription_expires_at) {
            const exp = new Date(adminRow.rows[0].subscription_expires_at + (adminRow.rows[0].subscription_expires_at.includes('T') ? '' : 'Z'));
            if (exp.getTime() <= Date.now()) {
              return res.status(403).json({ error: 'Your subscription has expired. Contact the super admin to renew access.' });
            }
          } else if (role !== 'super_admin' && !adminRow.rows[0].subscription_expires_at) {
            return res.status(403).json({ error: 'No active subscription on this account. Contact the super admin.' });
          }
        } else {
          // Not in admins table: legacy admin login allowed as regular admin (no scoped data yet)
          adminId = null;
        }
      } catch (e) {
        console.error('Admin role lookup failed (admins table may be missing):', e.message);
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role, adminId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role,
        adminId
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    console.error('Login error stack:', error.stack);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

module.exports = { login };
