const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const depositMethodsController = require('../controllers/adminDepositMethodsController');
const depositsController = require('../controllers/adminDepositsController');

// Deposit Methods routes
router.get('/methods', adminAuth, depositMethodsController.getAllMethods);
router.get('/methods/:id', adminAuth, depositMethodsController.getMethod);
router.post('/methods', adminAuth, depositMethodsController.createMethod);
router.put('/methods/:id', adminAuth, depositMethodsController.updateMethod);
router.delete('/methods/:id', adminAuth, depositMethodsController.deleteMethod);
router.patch('/methods/:id/toggle', adminAuth, depositMethodsController.toggleMethod);

// Deposit Requests routes
router.get('/requests', adminAuth, depositsController.getAllDeposits);
router.get('/requests/stats', adminAuth, depositsController.getDepositStats);
router.get('/requests/:id', adminAuth, depositsController.getDeposit);
router.patch('/requests/:id/status', adminAuth, depositsController.updateDepositStatus);

module.exports = router;
