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

const login = async (req, res) => {
  try {
    // Always ensure admin exists before login attempt
    await ensureAdmin();
    
    const { email, password } = req.body;

    // Support login by email OR username
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [email]
    );
    
    console.log('Login attempt for:', email);

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

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    console.error('Login error stack:', error.stack);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

module.exports = { login };
