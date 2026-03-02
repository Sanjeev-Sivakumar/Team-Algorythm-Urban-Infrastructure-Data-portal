const express = require('express');
const router = express.Router();
const slaController = require('../controllers/slaController');
const roleMiddleware = require('../middleware/roleMiddleware');

// view and breach queries allowed for authenticated users
router.get('/', slaController.getAllSLA);
router.get('/breaches', slaController.getBreachedSLAs);

// changes only by Admin/Officer
router.post('/', roleMiddleware(['Admin','Officer']), slaController.createSLA);
router.put('/:id', roleMiddleware(['Admin','Officer']), slaController.updateSLA);

module.exports = router;