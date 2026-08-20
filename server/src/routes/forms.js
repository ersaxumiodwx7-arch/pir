const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getAllForms,
  getFormById,
  getFormBySlug,
  createForm,
  updateForm,
  deleteForm,
  duplicateForm
} = require('../controllers/formsController');

// Public route for form filling
router.get('/slug/:slug', getFormBySlug);

// Protected routes (require authentication)
router.get('/', auth, getAllForms);
router.get('/:id', auth, getFormById);
router.post('/', auth, createForm);
router.put('/:id', auth, updateForm);
router.delete('/:id', auth, deleteForm);
router.post('/:id/duplicate', auth, duplicateForm);

module.exports = router;
