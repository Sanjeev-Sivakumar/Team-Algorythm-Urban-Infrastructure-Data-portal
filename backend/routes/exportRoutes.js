const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/assets/csv', roleMiddleware(['Admin']), exportController.exportAssetsCSV);
router.get('/assets/pdf', roleMiddleware(['Admin']), exportController.exportAssetsPDF);
router.get('/complaints/csv', roleMiddleware(['Admin']), exportController.exportComplaintsCSV);
router.get('/complaints/pdf', roleMiddleware(['Admin']), exportController.exportComplaintsPDF);
router.get('/maintenance/csv', roleMiddleware(['Admin']), exportController.exportMaintenanceCSV);
router.get('/maintenance/pdf', roleMiddleware(['Admin']), exportController.exportMaintenancePDF);
router.get('/dashboard/pdf', roleMiddleware(['Admin']), exportController.exportDashboardPDF);

module.exports = router;