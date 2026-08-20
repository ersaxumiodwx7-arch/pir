const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getFieldsByFormId,
  createField,
  updateField,
  deleteField,
  reorderFields
} = require('../controllers/fieldsController');

router.get('/form/:formId', auth, getFieldsByFormId);
router.post('/', auth, createField);
router.put('/:id', auth, updateField);
router.delete('/:id', auth, deleteField);
router.post('/reorder', auth, reorderFields);

module.exports = router;
