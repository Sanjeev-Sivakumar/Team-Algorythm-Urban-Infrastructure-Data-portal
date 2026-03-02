const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const roleMiddleware = require('../middleware/roleMiddleware');

// everyone with a valid token can view assets
router.get('/', assetController.getAssets);
router.get('/:id', assetController.getAssetById);

// only Admin and Officer may alter data
router.post('/', roleMiddleware(['Admin','Officer']), assetController.createAsset);
router.put('/:id', roleMiddleware(['Admin','Officer']), assetController.updateAsset);
router.delete('/:id', roleMiddleware(['Admin','Officer']), assetController.deleteAsset);

module.exports = router;