const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  getAllAgents, getAgent, createAgent, updateAgent, deleteAgent
} = require('../controllers/agentsController');

// Agent CRUD
router.get('/', adminAuth, getAllAgents);
router.get('/:id', adminAuth, getAgent);
router.post('/', adminAuth, createAgent);
router.put('/:id', adminAuth, updateAgent);
router.delete('/:id', adminAuth, deleteAgent);

module.exports = router;
