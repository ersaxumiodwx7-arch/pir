const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const ctrl = require('../controllers/adminAuthController');

// All routes require a valid admin token + super admin role
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

module.exports = router;
