const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  submitForm,
  getSubmissionsByFormId,
  getSubmissionById,
  exportSubmissionsToCSV
} = require('../controllers/submissionsController');

// Public route for form submission
router.post('/submit', submitForm);

// Protected routes (require authentication)
router.get('/form/:formId', auth, getSubmissionsByFormId);
router.get('/:id', auth, getSubmissionById);
router.get('/form/:formId/export', auth, exportSubmissionsToCSV);

module.exports = router;
