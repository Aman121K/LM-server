const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tlController = require('../controllers/tl.controller');

// Apply auth middleware to all routes
router.use(auth);

// Get all TLs
router.get('/', tlController.getAllTLs);

// Get TL's team members
router.get('/team/:tlId', tlController.getTeamMembers);

// Get TL's team performance
router.get('/performance/:tlId', tlController.getTeamPerformance);

// Get TL's daily performance
router.get('/daily-performance/:tlId', tlController.getDailyPerformance);

module.exports = router; 