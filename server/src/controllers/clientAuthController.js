const pool = require('../database/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const CLIENT_JWT_SECRET = process.env.JWT_SECRET + '_client';

// Client login with Case ID + password
const clientLogin = async (req, res) => {
  try {
    const { case_id, password } = req.body;

    if (!case_id || !password) {
      return res.status(400).json({ error: 'Case ID and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM clients WHERE case_id = $1',
      [case_id.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid Case ID or password' });
    }

    const client = result.rows[0];

    if (client.account_status === 'closed') {
      return res.status(403).json({ error: 'This account has been closed. Please contact support.' });
    }

    if (client.account_status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended. Please contact support.' });
    }

    const isValidPassword = await bcrypt.compare(password, client.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid Case ID or password' });
    }

    // Update last login
    await pool.query(
      'UPDATE clients SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [client.id]
    );

    // Log activity
    await pool.query(
      'INSERT INTO client_activity_logs (client_id, action, description, ip_address) VALUES ($1, $2, $3, $4)',
      [client.id, 'login', 'Client logged in', req.ip]
    );

    const token = jwt.sign(
      { clientId: client.id, caseId: client.case_id, role: 'client' },
      CLIENT_JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      client: {
        id: client.id,
        case_id: client.case_id,
        full_name: client.full_name,
        email: client.email,
        account_status: client.account_status,
        balance: client.display_balance
      }
    });
  } catch (error) {
    console.error('Client login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get client profile
const getClientProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, case_id, full_name, email, phone, account_status, display_balance as balance, account_type, created_at, last_login_at FROM clients WHERE id = $1',
      [req.client.clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const result = await pool.query('SELECT password_hash FROM clients WHERE id = $1', [req.client.clientId]);
    const client = result.rows[0];

    const isValid = await bcrypt.compare(current_password, client.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE clients SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, req.client.clientId]);

    await pool.query(
      'INSERT INTO client_activity_logs (client_id, action, description, ip_address) VALUES ($1, $2, $3, $4)',
      [req.client.clientId, 'password_change', 'Client changed password', req.ip]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Forgot password - generate reset token
const forgotPassword = async (req, res) => {
  try {
    const { case_id, email } = req.body;

    if (!case_id) {
      return res.status(400).json({ error: 'Case ID is required' });
    }

    const result = await pool.query(
      'SELECT id, email FROM clients WHERE case_id = $1',
      [case_id.toUpperCase()]
    );

    if (result.rows.length === 0) {
      // Don't reveal whether client exists
      return res.json({ message: 'If the account exists, a reset link has been sent.' });
    }

    const client = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await pool.query(
      'INSERT INTO client_password_resets (client_id, token, expires_at) VALUES ($1, $2, $3)',
      [client.id, token, expires]
    );

    // In production, send email with reset link. For now, return token.
    res.json({
      message: 'Password reset token generated',
      reset_token: token, // Remove this in production
      expires_at: expires
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM client_password_resets WHERE token = $1 AND used = 0 AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const reset = result.rows[0];
    const newHash = await bcrypt.hash(new_password, 10);

    await pool.query('UPDATE clients SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, reset.client_id]);
    await pool.query('UPDATE client_password_resets SET used = 1 WHERE id = $1', [reset.id]);

    await pool.query(
      'INSERT INTO client_activity_logs (client_id, action, description, ip_address) VALUES ($1, $2, $3, $4)',
      [reset.client_id, 'password_reset', 'Client reset password via token', req.ip]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { clientLogin, getClientProfile, changePassword, forgotPassword, resetPassword };
