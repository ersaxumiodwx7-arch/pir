const pool = require('../database/connection');

// GET /api/superadmin/site-visits?filter=all|bot|human|blocked&search=...
// Super admin only (the /api/superadmin router already enforces the role).
// Returns the latest site visits - pages and API calls from browsers and
// bots alike - each annotated with whether its IP is currently blocked.
const getSiteVisits = async (req, res) => {
  try {
    // Belt-and-suspenders: this endpoint must never leak to normal admins
    if (!req.user || req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    const filter = String(req.query.filter || 'all');
    const search = String(req.query.search || '').trim().slice(0, 100);

    const where = [];
    const params = [];
    if (filter === 'bot') where.push('v.is_bot = 1');
    else if (filter === 'human') where.push('v.is_bot = 0');
    else if (filter === 'blocked') where.push('b.id IS NOT NULL');
    if (search) {
      where.push(`(v.ip_address LIKE $${params.length + 1} OR v.path LIKE $${params.length + 2} OR v.user_agent LIKE $${params.length + 3})`);
      const p = `%${search}%`;
      params.push(p, p, p);
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const result = await pool.query(
      `SELECT v.id, v.ip_address, v.method, v.path, v.user_agent, v.is_bot, v.status_code, v.created_at,
              b.id AS block_id
       FROM site_visits v
       LEFT JOIN blocked_ips b ON b.ip_address = v.ip_address
       ${whereClause}
       ORDER BY v.id DESC
       LIMIT 500`,
      params
    );

    // Headline numbers over everything currently stored (the log keeps the
    // newest ~50,000 rows)
    const statsResult = await pool.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END), 0) AS bots,
              COALESCE(SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END), 0) AS humans
       FROM site_visits`
    );
    const statsRow = statsResult.rows[0] || {};

    res.json({
      visits: (result.rows || []).map(r => ({
        ...r,
        is_bot: Number(r.is_bot) === 1,
        ip_blocked: r.block_id != null,
      })),
      stats: {
        total: Number(statsRow.total) || 0,
        bots: Number(statsRow.bots) || 0,
        humans: Number(statsRow.humans) || 0,
      },
    });
  } catch (error) {
    console.error('Get site visits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getSiteVisits };
