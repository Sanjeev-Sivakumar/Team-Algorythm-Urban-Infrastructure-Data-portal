const express = require('express');
const router = express.Router();
const advancedController = require('../controllers/advancedController');
const roleMiddleware = require('../middleware/roleMiddleware');

// ML Predictions
router.get('/ml/predict/:assetId', advancedController.predictFailure);
router.get('/ml/forecast', advancedController.forecastMaintenance);
router.post('/ml/budget-optimize', roleMiddleware(['Admin']), advancedController.optimizeBudget);

// Blockchain
router.post('/blockchain/contract', roleMiddleware(['Admin']), advancedController.createContract);
router.post('/blockchain/work-proof', roleMiddleware(['Officer', 'Admin']), advancedController.submitWorkProof);
router.post('/blockchain/release/:contractId', roleMiddleware(['Admin']), advancedController.releasePayment);

// Climate Risk
router.get('/climate/assess/:assetId', advancedController.assessClimate);

// Simulations
router.post('/simulate/budget', roleMiddleware(['Admin']), advancedController.simulateBudget);
router.post('/simulate/strategy', roleMiddleware(['Admin', 'Officer']), advancedController.simulateStrategy);
router.post('/simulate/cascade', advancedController.simulateCascade);

// Optimization
router.post('/optimize/contractor', roleMiddleware(['Admin', 'Officer']), advancedController.optimizeContractor);
router.get('/optimize/routing', roleMiddleware(['Officer', 'Admin']), advancedController.optimizeRouting);
router.post('/optimize/emergency', advancedController.optimizeEmergency);

// IoT & Verification
router.post('/iot/register', roleMiddleware(['Admin']), advancedController.registerDevice);
router.post('/iot/anomaly', advancedController.checkAnomaly);
router.post('/verify/qr/:complaintId', advancedController.generateQR);
router.get('/verify/qr/:qrCode', advancedController.verifyQR);

module.exports = router;
