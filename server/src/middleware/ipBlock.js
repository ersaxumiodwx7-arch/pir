const pool = require('../database/connection');

// Extract the real client IP. Railway/Render sit behind a reverse proxy, so
// the server must run with app.set('trust proxy', ...) for req.ip to carry
// the forwarded client address rather than the proxy's.
function getClientIp(req) {
  return String(req.ip || '').replace(/^::ffff:/, '').trim();
}

// Escape the IP for safe interpolation into the HTML block page
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// The page a blocked visitor gets instead of the site - no app code, no
// assets, nothing else loads.
function blockPage(ip) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Access Denied</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#0f172a; color:#e2e8f0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; }
  .box { max-width:440px; text-align:center; padding:40px 30px; }
  .lock { font-size:46px; margin-bottom:14px; }
  h1 { font-size:22px; margin:0 0 10px; color:#f87171; }
  p { font-size:14px; line-height:1.6; color:#94a3b8; margin:0 0 6px; }
  code { color:#cbd5e1; background:#1e293b; padding:2px 10px; border-radius:6px; font-size:13px; }
</style>
</head>
<body>
  <div class="box">
    <div class="lock">&#9940;</div>
    <h1>Access Denied</h1>
    <p>Your network address has been blocked by the administrator.</p>
    <p>If you believe this is a mistake, contact support from another network.</p>
    <p><code>${escapeHtml(ip || 'unknown')}</code></p>
  </div>
</body>
</html>`;
}

// IPs that must never be blocked - escape hatch against locking yourself out.
// Set ADMIN_IP_WHITELIST="1.2.3.4,5.6.7.8" (comma separated) in the environment.
const ipWhitelist = () => new Set(
  String(process.env.ADMIN_IP_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean)
);

// Cached blocked-IP set, refreshed at most every 30s and invalidated
// immediately by the block/unblock endpoints, so admin actions apply
// instantly without a DB query on every single request.
let cache = { at: 0, set: new Set() };
const CACHE_TTL_MS = 30 * 1000;

async function getBlockedIpSet() {
  const now = Date.now();
  if (now - cache.at > CACHE_TTL_MS) {
    const r = await pool.query('SELECT ip_address FROM blocked_ips');
    cache = { at: now, set: new Set((r.rows || []).map(row => row.ip_address)) };
  }
  return cache.set;
}

function invalidateBlockedIpCache() {
  cache.at = 0;
}

// Returns the blocked row if this IP is blocked, else null (single-IP lookup,
// used by the login handler for a richer message)
async function findBlockedIp(ip) {
  if (!ip) return null;
  const r = await pool.query('SELECT * FROM blocked_ips WHERE ip_address = $1', [ip]);
  return r.rows[0] || null;
}

// Middleware: reject requests from blocked IPs (login endpoints only).
// Fails OPEN on internal errors - a DB hiccup must not lock every user out.
const blockBlockedIps = async (req, res, next) => {
  try {
    const ip = getClientIp(req);
    const blocked = (await getBlockedIpSet()).has(ip);
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

// Middleware: site-wide blocking. Mounted before EVERYTHING (static files,
// uploads, API routes), so a blocked IP cannot load any page or call any
// endpoint - they get a plain "Access Denied" page and nothing else.
const blockAllRequests = async (req, res, next) => {
  // Platform health checks must always pass so deploys are not killed
  if (req.path === '/api/health') return next();
  const ip = getClientIp(req);
  if (!ip || ipWhitelist().has(ip)) return next();
  try {
    const blocked = (await getBlockedIpSet()).has(ip);
    if (blocked) {
      return res.status(403)
        .set('Cache-Control', 'no-store')
        .type('html')
        .send(blockPage(ip));
    }
    next();
  } catch (e) {
    console.error('Site-wide IP block check failed (failing open):', e.message);
    next();
  }
};

module.exports = { getClientIp, findBlockedIp, blockBlockedIps, blockAllRequests, invalidateBlockedIpCache };
