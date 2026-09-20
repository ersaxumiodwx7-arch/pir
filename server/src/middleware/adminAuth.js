const jwt = require('jsonwebtoken');
const pool = require('../database/connection');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Existing tokens have userId and email (no role field)
    if (!decoded.userId) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = {
      ...decoded,
      role: decoded.role || 'admin',
      adminId: decoded.adminId !== undefined ? decoded.adminId : null
    };

    // Multi-admin enforcement: normal admins must have an active subscription
    if (req.user.role !== 'super_admin') {
      try {
        const adminRow = await pool.query('SELECT * FROM admins WHERE username = (SELECT username FROM users WHERE id = $1)', [req.user.userId]);
        if (adminRow.rows.length > 0) {
          const a = adminRow.rows[0];
          if (!a.is_active) {
            return res.status(403).json({ error: 'This admin account is disabled. Contact the super admin.' });
          }
          if (a.role === 'super_admin') {
            req.user.role = 'super_admin';
          } else if (a.subscription_expires_at) {
            const exp = new Date(a.subscription_expires_at + (a.subscription_expires_at.includes('T') ? '' : 'Z'));
            if (exp.getTime() <= Date.now()) {
              return res.status(403).json({ error: 'Your subscription has expired. Contact the super admin to renew access.' });
            }
          } else {
            return res.status(403).json({ error: 'No active subscription on this account. Contact the super admin.' });
          }
        }
        // If no admins row: legacy admin (pre-multi-admin) - allowed unscoped for compatibility
      } catch (e) {
        // admins table may not exist yet; treat as legacy admin
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = adminAuth;
