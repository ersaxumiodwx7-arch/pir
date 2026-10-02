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

// The "error" a blocked visitor gets instead of the site. It mimics a
// generic browser/network failure (HTTP 404 + a Chrome-style "This site
// can't be reached" page) so the block reads as "the site doesn't exist"
// rather than as an intentional ban.
function blockPage(host) {
  const h = escapeHtml(host || 'this site');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h}</title>
<style>
  html, body { margin:0; padding:0; }
  body { min-height:100vh; background:#fff; color:#202124;
         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
         display:flex; align-items:center; }
  .wrap { max-width:560px; margin:0 auto; padding:32px; width:100%; box-sizing:border-box; }
  .icon { margin-bottom:24px; }
  h1 { font-size:22px; font-weight:400; margin:0 0 12px; color:#202124; }
  p { font-size:15px; line-height:1.6; margin:0 0 12px; color:#5f6368; }
  .host { font-weight:700; color:#202124; }
  .actions { margin-top:24px; }
  .reload { -webkit-appearance:none; appearance:none; background:#1a73e8; color:#fff; border:0;
            border-radius:4px; padding:9px 22px; font-size:14px; font-family:inherit; cursor:pointer; }
  .code { margin-top:28px; font-size:12px; color:#9aa0a6; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="icon">
      <svg width="72" height="60" viewBox="0 0 72 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="36" cy="30" r="26" stroke="#dadce0" stroke-width="4"/>
        <circle cx="27" cy="24" r="3.5" fill="#dadce0"/>
        <circle cx="45" cy="24" r="3.5" fill="#dadce0"/>
        <path d="M25 40c3-4 7-6 11-6s8 2 11 6" stroke="#dadce0" stroke-width="4" stroke-linecap="round"/>
      </svg>
    </div>
    <h1>This site can't be reached</h1>
    <p><span class="host">${h}</span>'s server IP address could not be found.</p>
    <div class="actions"><button class="reload" onclick="location.reload()">Reload</button></div>
    <p class="code">ERR_NAME_NOT_RESOLVED</p>
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
      // 404 + a browser-style "site can't be reached" page: to the visitor it
      // looks like the site simply does not exist, not like a ban.
      return res.status(404)
        .set('Cache-Control', 'no-store')
        .type('html')
        .send(blockPage(req.hostname || (req.headers && req.headers.host)));
    }
    next();
  } catch (e) {
    console.error('Site-wide IP block check failed (failing open):', e.message);
    next();
  }
};

module.exports = { getClientIp, findBlockedIp, blockBlockedIps, blockAllRequests, invalidateBlockedIpCache };
