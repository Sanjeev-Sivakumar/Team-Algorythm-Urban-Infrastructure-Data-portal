const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const roleMiddleware = require('../middleware/roleMiddleware');

/**
 * Dashboard Overview (Admin/Officer only)
 */
router.get('/', roleMiddleware(['Admin','Officer']), dashboardController.getDashboardStats);

module.exports = router;