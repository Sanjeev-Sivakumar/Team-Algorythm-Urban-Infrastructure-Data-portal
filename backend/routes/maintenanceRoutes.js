const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const roleMiddleware = require('../middleware/roleMiddleware');

// anyone authenticated can view records
router.get('/', maintenanceController.getAllMaintenance);
router.get('/:id', maintenanceController.getMaintenanceById);

// only Admin/Officer can create, update or delete
router.post('/', roleMiddleware(['Admin','Officer']), maintenanceController.createMaintenance);
router.put('/:id', roleMiddleware(['Admin','Officer']), maintenanceController.updateMaintenance);
router.delete('/:id', roleMiddleware(['Admin','Officer']), maintenanceController.deleteMaintenance);

module.exports = router;