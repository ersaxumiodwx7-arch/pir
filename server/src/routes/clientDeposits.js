const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const clientAuth = require('../middleware/clientAuth');
const clientDepositController = require('../controllers/clientDepositController');

// Configure multer for payment proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG, PNG, GIF) and PDF files are allowed'));
  }
});

// Get active deposit methods (for logged-in clients)
router.get('/methods', clientAuth, clientDepositController.getActiveMethods);
router.get('/methods/:id', clientAuth, clientDepositController.getMethodDetails);

// Submit deposit request (with optional payment proof upload)
router.post('/submit', clientAuth, upload.single('payment_proof'), clientDepositController.submitDeposit);

// Get my deposit history
router.get('/my-deposits', clientAuth, clientDepositController.getMyDeposits);
router.get('/my-deposits/:id', clientAuth, clientDepositController.getMyDepositDetails);

module.exports = router;
