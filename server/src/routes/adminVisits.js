const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { getAllVisits, blockVisitIp, unblockVisitIp } = require('../controllers/adminVisitsController');

// Cross-client login activity (scoped: super admin = all clients,
// normal admin = their own clients only)
router.get('/', adminAuth, getAllVisits);
router.post('/block-ip', adminAuth, blockVisitIp);
router.post('/unblock-ip', adminAuth, unblockVisitIp);

module.exports = router;
