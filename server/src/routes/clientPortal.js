const express = require('express');
const router = express.Router();
const clientAuth = require('../middleware/clientAuth');
const {
  clientLogin, getClientProfile, changePassword, forgotPassword, resetPassword
} = require('../controllers/clientAuthController');
const { verifyAgent } = require('../controllers/agentsController');
const {
  getDashboard, getAccountDetails, getTransactions,
  getDocuments, getNotifications, markNotificationRead, markAllNotificationsRead,
  getActivity, getBillPayments, submitBillPayment
} = require('../controllers/clientPortalController');

// Public auth routes
router.post('/auth/login', clientLogin);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

// Protected routes
router.get('/auth/profile', clientAuth, getClientProfile);
router.post('/auth/change-password', clientAuth, changePassword);

// Dashboard
router.get('/dashboard', clientAuth, getDashboard);
router.get('/account', clientAuth, getAccountDetails);
router.get('/transactions', clientAuth, getTransactions);
router.get('/documents', clientAuth, getDocuments);

// Notifications
router.get('/notifications', clientAuth, getNotifications);
router.put('/notifications/:id/read', clientAuth, markNotificationRead);
router.put('/notifications/read-all', clientAuth, markAllNotificationsRead);

// Activity
router.get('/activity', clientAuth, getActivity);

// Bill Payments
router.get('/bill-payments', clientAuth, getBillPayments);
router.post('/bill-payments', clientAuth, submitBillPayment);

// Agent Verification (public)
router.get('/verify-agent/:agent_id', verifyAgent);

module.exports = router;
