const pool = require('../database/connection');
const bcrypt = require('bcryptjs');

// Resolve the requester's role: JWT role first, fallback to users table
async function resolveRole(req) {
  if (req.user && req.user.role === 'super_admin') return 'super_admin';
  if (req.user && req.user.userId) {
    const r = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.userId]);
    if (r.rows.length > 0 && r.rows[0].username === (process.env.ADMIN_USERNAME || 'pirates')) {
      return 'super_admin';
    }
  }
  return 'admin';
}

// Helper: check subscription status for a normal admin
function subscriptionStatus(admin) {
  if (admin.role === 'super_admin') return { active: true, expires: null };
  if (!admin.subscription_expires_at) return { active: false, expires: null, reason: 'No subscription set' };
  const expires = new Date(admin.subscription_expires_at + (admin.subscription_expires_at.includes('T') ? '' : 'Z'));
  return { active: expires.getTime() > Date.now(), expires: admin.subscription_expires_at };
}

// GET /api/superadmin/admins - list all admin accounts
const listAdmins = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.username, a.email, a.role, a.is_active, a.subscription_expires_at, a.created_at,
              (SELECT COUNT(*) FROM clients c WHERE c.admin_id = a.id) AS client_count
       FROM admins a ORDER BY a.role DESC, a.created_at ASC`
    );
    const admins = result.rows.map(a => ({
      ...a,
      client_count: Number(a.client_count || 0),
      subscription: subscriptionStatus(a)
    }));
    res.json({ admins });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list admins: ' + error.message });
  }
};

// POST /api/superadmin/admins - create a normal admin account
const createAdmin = async (req, res) => {
  try {
    const { username, email, password, subscription_days, subscription_expires_at } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Prevent collision with the seeded super admin username
    const superUsername = process.env.ADMIN_USERNAME || 'pirates';
    if (String(username).toLowerCase() === String(superUsername).toLowerCase()) {
      return res.status(400).json({ error: 'That username is reserved' });
    }

    const existing = await pool.query('SELECT id FROM admins WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An admin with that username already exists' });
    }

    let expires = null;
    if (subscription_expires_at) {
      expires = subscription_expires_at;
    } else if (subscription_days) {
      const days = parseInt(subscription_days, 10);
      if (isNaN(days) || days <= 0) {
        return res.status(400).json({ error: 'Subscription days must be a positive number' });
      }
      expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const result = await pool.query(
      `INSERT INTO admins (username, email, password_hash, role, subscription_expires_at, created_by)
       VALUES ($1, $2, $3, 'admin', $4, $5) RETURNING id`,
      [username, email || null, passwordHash, expires, req.user ? req.user.userId : null]
    );

    // Mirror into users table so /api/auth/login can authenticate this username
    try {
      const usersTable = await pool.query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
      if (usersTable.rows.length > 0) {
        const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length === 0) {
          await pool.query(
            'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3)',
            [email || (username + '@admin.local'), username, passwordHash]
          );
        }
      }
    } catch (e) {
      console.error('Failed to mirror admin into users table:', e.message);
    }

    res.status(201).json({
      message: 'Admin account created',
      admin: { id: result.rows[0].id, username, email: email || null, role: 'admin', subscription_expires_at: expires }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create admin: ' + error.message });
  }
};

// PUT /api/superadmin/admins/:id - update subscription / password / status
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM admins WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    const admin = existing.rows[0];
    if (admin.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot modify the super admin account' });
    }

    const { subscription_days, subscription_expires_at, password, is_active, email } = req.body;
    let expires = admin.subscription_expires_at;
    if (subscription_expires_at !== undefined) {
      expires = subscription_expires_at; // null clears it
    } else if (subscription_days !== undefined && subscription_days !== null && subscription_days !== '') {
      const days = parseInt(subscription_days, 10);
      if (isNaN(days) || days <= 0) {
        return res.status(400).json({ error: 'Subscription days must be a positive number' });
      }
      expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    let passwordHash = admin.password_hash;
    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      passwordHash = await bcrypt.hash(String(password), 10);
    }

    const active = is_active === undefined ? admin.is_active : (is_active ? 1 : 0);

    await pool.query(
      'UPDATE admins SET email = $1, password_hash = $2, is_active = $3, subscription_expires_at = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
      [email !== undefined ? email : admin.email, passwordHash, active, expires, id]
    );

    // Keep users table in sync (password/email changes must reflect for login)
    try {
      const usersTable = await pool.query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
      if (usersTable.rows.length > 0) {
        const finalEmail = email !== undefined ? email : admin.email;
        const userUpdate = await pool.query('UPDATE users SET password_hash = $1, email = $2 WHERE username = $3',
          [passwordHash, finalEmail || (admin.username + '@admin.local'), admin.username]);
        // If no user row existed (e.g. created before mirroring was added), create it
        if (!userUpdate.changes) {
          const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [admin.username]);
          if (existingUser.rows.length === 0) {
            await pool.query(
              'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3)',
              [finalEmail || (admin.username + '@admin.local'), admin.username, passwordHash]
            );
          }
        }
      }
    } catch (e) {
      console.error('Failed to sync admin to users table:', e.message);
    }

    res.json({ message: 'Admin updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update admin: ' + error.message });
  }
};

// DELETE /api/superadmin/admins/:id - delete a normal admin
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM admins WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    if (existing.rows[0].role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot delete the super admin account' });
    }

    // Unassign their clients instead of deleting data (preserves client records)
    await pool.query('UPDATE clients SET admin_id = NULL WHERE admin_id = $1', [id]);
    await pool.query('DELETE FROM admins WHERE id = $1', [id]);

    // Remove their login from users table too
    try {
      await pool.query('DELETE FROM users WHERE username = $1', [existing.rows[0].username]);
    } catch (e) {
      console.error('Failed to remove admin user row:', e.message);
    }

    res.json({ message: 'Admin deleted. Their clients were unassigned and preserved.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete admin: ' + error.message });
  }
};

module.exports = { resolveRole, subscriptionStatus, listAdmins, createAdmin, updateAdmin, deleteAdmin };
