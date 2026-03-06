const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticate = require('../middleware/auth');

/**
 * Dashboard Overview (All authenticated users)
 */
router.get('/', authenticate, dashboardController.getDashboardStats);
router.get('/stats', authenticate, dashboardController.getDashboardStats);

module.exports = router;