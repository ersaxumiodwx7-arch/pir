const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const ctrl = require('../controllers/adminAuthController');
const siteVisits = require('../controllers/siteVisitsController');

// Bot provisioning endpoint — only the Telegram bot can call it.
// The bot authenticates with X-Site-Api-Key (its own key), no admin session needed.
router.post('/bot-admins', (req, res, next) => {
  const botKey = req.header('X-Site-Api-Key');
  if (!botKey || botKey !== process.env.SITE_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized — unknown bot API key' });
  }
  req.user = { role: 'super_admin', adminId: 'bot', userId: 'bot' }; // for any role checks
  next();
}, ctrl.createBotAdmin);

// All other admin routes (list/edit/delete) keep the existing admin-token check
router.use(adminAuth, async (req, res, next) => {
  try {
    const role = await ctrl.resolveRole(req);
    if (role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    req.user.role = role;
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admins', ctrl.listAdmins);
router.post('/admins', ctrl.createAdmin);
router.put('/admins/:id', ctrl.updateAdmin);
router.delete('/admins/:id', ctrl.deleteAdmin);

// Site-wide visit log (bots vs humans) - super admin eyes only
router.get('/site-visits', siteVisits.getSiteVisits);

module.exports = router;
