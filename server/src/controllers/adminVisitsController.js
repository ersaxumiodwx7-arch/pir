const pool = require('../database/connection');

// Cross-client "All Visits" login activity.
// Super admin sees visits for every client.
// Normal admins see visits only for their own clients (same scope rule as
// the clients list: client.admin_id must match the admin's id).
function visitsScope(req) {
  if (req.user && req.user.role === 'super_admin') return { clause: '', params: [] };
  if (req.user && req.user.adminId) return { clause: ' AND c.admin_id = $SCOPE$', params: [req.user.adminId] };
  // Legacy admin token (no adminId): fall back to unscoped for compatibility
  return { clause: '', params: [] };
}

// Renumber $SCOPE$ placeholder against existing params
function applyScope(whereClause, params, scope) {
  if (!scope.clause) return { clause: whereClause, params };
  const next = [...params, scope.params[0]];
  return { clause: whereClause + scope.clause.replace('$SCOPE$', '$' + next.length), params: next };
}

// GET /api/admin/visits - login activity across clients (scoped), each row
// enriched with the current blocked state of its IP so the UI can render a
// correct Block/Unblock button immediately.
const getAllVisits = async (req, res) => {
  try {
    const scope = visitsScope(req);
    const { clause, params } = applyScope(`WHERE l.action = 'login'`, [], scope);

    const result = await pool.query(
      `SELECT l.id, l.client_id, l.action, l.description, l.ip_address, l.user_agent,
              l.timezone, l.created_at,
              c.full_name, c.case_id, c.username
       FROM client_activity_logs l
       INNER JOIN clients c ON c.id = l.client_id
       ${clause}
       ORDER BY l.created_at DESC
       LIMIT 500`,
      params
    );

    const blocked = await pool.query('SELECT id, ip_address FROM blocked_ips');
    const blockedMap = new Map((blocked.rows || []).map(b => [b.ip_address, b.id]));

    res.json(result.rows.map(r => ({
      ...r,
      ip_blocked: blockedMap.has(r.ip_address),
      block_id: blockedMap.get(r.ip_address) || null
    })));
  } catch (error) {
    console.error('Get all visits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/admin/visits/block-ip  { ip_address }
// Idempotent-friendly: re-blocking an already-blocked IP succeeds silently so
// the button never dead-ends.
const blockVisitIp = async (req, res) => {
  try {
    const ip = String(req.body.ip_address || '').trim();
    if (!ip || ip.length > 64 || !/^[0-9a-fA-F:.]+$/.test(ip)) {
      return res.status(400).json({ error: 'A valid IP address is required' });
    }
    try {
      await pool.query(
        'INSERT INTO blocked_ips (ip_address, reason, created_by) VALUES ($1, $2, $3)',
        [ip, 'Blocked from All Visits', req.user ? req.user.userId : null]
      );
    } catch (e) {
      if (e.message.includes('unique') || e.message.includes('duplicate')) {
        return res.json({ message: 'IP was already blocked', already_blocked: true });
      }
      throw e;
    }
    res.status(201).json({ message: `IP ${ip} blocked` });
  } catch (error) {
    console.error('Block visit IP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/admin/visits/unblock-ip  { ip_address }
// Accepts the raw IP (so the UI never needs the blocked row's internal id)
// or a numeric blocked row id for convenience.
const unblockVisitIp = async (req, res) => {
  try {
    const raw = String(req.body.ip_address || '').trim();
    if (!raw) {
      return res.status(400).json({ error: 'ip_address is required' });
    }
    const r = /^\d+$/.test(raw)
      ? await pool.query('DELETE FROM blocked_ips WHERE id = $1', [Number(raw)])
      : await pool.query('DELETE FROM blocked_ips WHERE ip_address = $1', [raw]);
    if (!r.changes) {
      return res.status(404).json({ error: 'That IP was not on the blocked list' });
    }
    res.json({ message: 'IP unblocked' });
  } catch (error) {
    console.error('Unblock visit IP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllVisits, blockVisitIp, unblockVisitIp };
