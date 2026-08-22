const pool = require('../database/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
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
