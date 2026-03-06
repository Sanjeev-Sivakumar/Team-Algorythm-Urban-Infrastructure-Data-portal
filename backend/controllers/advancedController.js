const mlService = require('../services/mlService');
const blockchainService = require('../services/blockchainService');
const climateService = require('../services/climateService');
const simulationService = require('../services/simulationService');
const optimizationService = require('../services/optimizationService');
const iotService = require('../services/iotService');
const pool = require('../config/db');

// ML Predictions
exports.predictFailure = async (req, res) => {
    try {
        const { assetId } = req.params;
        const asset = await pool.query('SELECT * FROM assets WHERE id = $1', [assetId]);
        
        if (asset.rows.length === 0) {
            return res.status(404).json({ error: 'Asset not found' });
        }
        
        const assetData = asset.rows[0];
        const age = Math.floor((Date.now() - new Date(assetData.installation_date)) / (365 * 86400000));
        const maintenanceCount = await pool.query(
            'SELECT COUNT(*) FROM maintenance_schedule WHERE asset_id = $1', [assetId]
        );
        
        const prediction = await mlService.predictAssetFailure(
            assetData.type, age, parseInt(maintenanceCount.rows[0].count)
        );
        
        await pool.query(
            `INSERT INTO ml_predictions (asset_id, prediction_type, failure_probability, predicted_failure_date, confidence_score)
             VALUES ($1, 'Failure', $2, $3, $4)`,
            [assetId, prediction.failureProbability, prediction.predictedFailureDate, prediction.confidenceScore]
        );
        
        res.json(prediction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.forecastMaintenance = async (req, res) => {
    try {
        const forecast = await mlService.forecastMaintenance(req.query.department);
        res.json(forecast);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.optimizeBudget = async (req, res) => {
    try {
        const { totalBudget } = req.body;
        const allocation = await mlService.optimizeBudget(totalBudget);
        res.json(allocation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Blockchain Smart Contracts
exports.createContract = async (req, res) => {
    try {
        const { complaintId, contractorAddress, escrowAmount } = req.body;
        const contract = await blockchainService.createSmartContract(complaintId, contractorAddress, escrowAmount);
        res.json(contract);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.submitWorkProof = async (req, res) => {
    try {
        const { contractId, workProofHash } = req.body;
        const contract = await blockchainService.verifyWorkProof(contractId, workProofHash);
        res.json(contract);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.releasePayment = async (req, res) => {
    try {
        const { contractId } = req.params;
        const contract = await blockchainService.releasePayment(contractId);
        res.json(contract);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Climate Risk
exports.assessClimate = async (req, res) => {
    try {
        const { assetId } = req.params;
        const asset = await pool.query('SELECT ST_Y(geometry::geometry) as lat, ST_X(geometry::geometry) as lng FROM assets WHERE id = $1', [assetId]);
        
        if (asset.rows.length === 0) {
            return res.status(404).json({ error: 'Asset not found' });
        }
        
        const riskData = await climateService.assessClimateRisk(asset.rows[0].lat, asset.rows[0].lng);
        const assessment = await climateService.saveClimateAssessment(assetId, riskData);
        
        res.json(assessment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Simulations
exports.simulateBudget = async (req, res) => {
    try {
        const { budgetChange } = req.body;
        const result = await simulationService.simulateBudgetChange(budgetChange, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.simulateStrategy = async (req, res) => {
    try {
        const { strategy } = req.body;
        const result = await simulationService.simulateMaintenanceStrategy(strategy, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.simulateCascade = async (req, res) => {
    try {
        const { assetType } = req.body;
        const cascade = await simulationService.simulateCascadingFailure(assetType);
        res.json(cascade);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Optimization
exports.optimizeContractor = async (req, res) => {
    try {
        const { complaintType, location } = req.body;
        const contractors = await optimizationService.optimizeContractorAssignment(complaintType, location);
        res.json(contractors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.optimizeRouting = async (req, res) => {
    try {
        const routes = await optimizationService.optimizeWorkforceRouting();
        res.json(routes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.optimizeEmergency = async (req, res) => {
    try {
        const { emergencyType, location } = req.body;
        const response = await optimizationService.optimizeEmergencyResponse(emergencyType, location);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// IoT & Verification
exports.registerDevice = async (req, res) => {
    try {
        const { assetId, deviceType } = req.body;
        const device = await iotService.registerIoTDevice(assetId, deviceType);
        res.json(device);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.checkAnomaly = async (req, res) => {
    try {
        const sensorData = req.body;
        const result = iotService.detectAnomaly(sensorData);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.generateQR = async (req, res) => {
    try {
        const { complaintId } = req.params;
        const qr = await iotService.generateQRVerification(complaintId);
        res.json(qr);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.verifyQR = async (req, res) => {
    try {
        const { qrCode } = req.params;
        const verification = await iotService.verifyQRCode(qrCode);
        res.json(verification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
