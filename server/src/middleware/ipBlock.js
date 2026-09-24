const pool = require('../database/connection');

// Extract the real client IP. Railway/Render sit behind a reverse proxy, so
// the server must run with app.set('trust proxy', ...) for req.ip to carry
// the forwarded client address rather than the proxy's.
function getClientIp(req) {
  return String(req.ip || '').replace(/^::ffff:/, '').trim();
}

// Returns the blocked row if this IP is blocked, else null
async function findBlockedIp(ip) {
  if (!ip) return null;
  const r = await pool.query('SELECT * FROM blocked_ips WHERE ip_address = $1', [ip]);
  return r.rows[0] || null;
}

// Middleware: reject requests from blocked IPs.
// Fails OPEN on internal errors - a DB hiccup must not lock every user out.
const blockBlockedIps = async (req, res, next) => {
  try {
    const ip = getClientIp(req);
    const blocked = await findBlockedIp(ip);
    if (blocked) {
      return res.status(403).json({
        error: 'Access denied. Your network address has been blocked. Contact support if you believe this is a mistake.'
      });
    }
    next();
  } catch (e) {
    console.error('IP block check failed (failing open):', e.message);
    next();
  }
};

module.exports = { getClientIp, findBlockedIp, blockBlockedIps };
