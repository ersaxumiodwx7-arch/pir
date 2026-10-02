const pool = require('../database/connection');

// Classify a user agent as a bot/crawler vs a normal browser visit.
const BOT_PATTERN = /bot|crawl|spider|slurp|curl|wget|python|java\/|okhttp|libwww|httpclient|go-http|scrap|headless|phantom|lighthouse|pagespeed|uptime|monitor|pingdom|statuscake|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|yandex|baidu|sogou|archive|preview|facebookexternalhit|whatsapp|telegram|discord|slack|twitterbot|embedly|insomnia|postman/i;

function isBotUserAgent(ua) {
  const s = String(ua || '').trim();
  if (!s) return true; // scripts and scanners often send no User-Agent at all
  return BOT_PATTERN.test(s);
}

// Static assets are noise - log page loads and API calls only
const ASSET_RE = /\.(js|css|map|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|otf|mp4|webm|txt|xml|pdf)$/i;

function shouldLog(req) {
  if (req.method === 'OPTIONS') return false; // CORS preflights
  if (req.path === '/api/health') return false; // platform healthcheck noise
  if (req.path === '/favicon.ico') return false;
  if (ASSET_RE.test(req.path)) return false;
  return true;
}

// Middleware: record every site visit. Runs before everything else, so
// blocked attempts are logged too (with their final status code), giving the
// super admin a full picture of who - human or bot - is hitting the site.
const logSiteVisits = (req, res, next) => {
  if (!shouldLog(req)) return next();

  const record = {
    ip: String(req.ip || '').replace(/^::ffff:/, '').trim().slice(0, 64) || null,
    method: req.method,
    // req.path only (no query string) so tokens in URLs are never stored
    path: String(req.path || '').slice(0, 300),
    ua: String(req.headers['user-agent'] || '').trim().slice(0, 400) || null,
    bot: isBotUserAgent(req.headers['user-agent']) ? 1 : 0,
  };

  // Write asynchronously once the response is finished - logging must never
  // slow down or break a request.
  res.on('finish', () => {
    insertVisit(record, res.statusCode).catch(() => {});
  });

  next();
};

let insertCount = 0;

async function insertVisit(record, statusCode) {
  await pool.query(
    'INSERT INTO site_visits (ip_address, method, path, user_agent, is_bot, status_code) VALUES ($1, $2, $3, $4, $5, $6)',
    [record.ip, record.method, record.path, record.ua, record.bot, statusCode]
  );

  // Keep the table bounded: every ~300th insert, trim rows older than the
  // newest 50,000 so the log cannot grow forever.
  if ((++insertCount % 300) === 0) {
    try {
      await pool.query('DELETE FROM site_visits WHERE id <= (SELECT MAX(id) FROM site_visits) - 50000');
    } catch (e) {
      console.error('site_visits prune failed:', e.message);
    }
  }
}

module.exports = { logSiteVisits, isBotUserAgent };
