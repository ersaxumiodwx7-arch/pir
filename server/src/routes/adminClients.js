const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  getAllClients, getClient, createClient, updateClient, deleteClient,
  getClientTransactions, createTransaction, updateTransaction, deleteTransaction,
  getClientDocuments, uploadDocument, deleteDocument,
  getClientNotifications, createNotification, updateNotification, deleteNotification, broadcastNotification,
  getBillPayments, createBillPayment, updateBillPaymentStatus,
  getClientActivity,
  getClientDepositMethods, createClientDepositMethod, updateClientDepositMethod, deleteClientDepositMethod,
  updatePickupTracking
} = require('../controllers/adminClientsController');

// Client CRUD
router.get('/', adminAuth, getAllClients);
router.get('/:id', adminAuth, getClient);
router.post('/', adminAuth, createClient);
router.put('/:id', adminAuth, updateClient);
router.delete('/:id', adminAuth, deleteClient);

// Transactions
router.get('/:id/transactions', adminAuth, getClientTransactions);
router.post('/:id/transactions', adminAuth, createTransaction);
router.put('/:id/transactions/:transactionId', adminAuth, updateTransaction);
router.delete('/:id/transactions/:transactionId', adminAuth, deleteTransaction);

// Documents
router.get('/:id/documents', adminAuth, getClientDocuments);
router.post('/:id/documents', adminAuth, uploadDocument);
router.delete('/:id/documents/:documentId', adminAuth, deleteDocument);

// Notifications
router.get('/:id/notifications', adminAuth, getClientNotifications);
router.post('/:id/notifications', adminAuth, createNotification);
router.put('/:id/notifications/:notificationId', adminAuth, updateNotification);
router.delete('/:id/notifications/:notificationId', adminAuth, deleteNotification);

// Broadcast notification to all clients
router.post('/broadcast/notification', adminAuth, broadcastNotification);

// Client Deposit Methods (per-client)
router.get('/:id/deposit-methods', adminAuth, getClientDepositMethods);
router.post('/:id/deposit-methods', adminAuth, createClientDepositMethod);
router.put('/:id/deposit-methods/:methodId', adminAuth, updateClientDepositMethod);
router.delete('/:id/deposit-methods/:methodId', adminAuth, deleteClientDepositMethod);
router.put('/:id/deposit-methods/:methodId/tracking', adminAuth, updatePickupTracking);

// Bill Payments
router.get('/:id/bill-payments', adminAuth, getBillPayments);
router.post('/:id/bill-payments', adminAuth, createBillPayment);
router.put('/:id/bill-payments/:billId', adminAuth, updateBillPaymentStatus);

// Activity
router.get('/:id/activity', adminAuth, getClientActivity);

module.exports = router;
