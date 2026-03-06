/**
 * InfraBrain AI Intelligence Routes
 * All AI/ML Engine endpoints (Modules 4-16)
 */

const express = require('express');
const router = express.Router();
const intelligenceController = require('../controllers/intelligenceController');

/**
 * Module 4: Health Scoring Engine
 */
router.get('/health/:assetId', intelligenceController.getAssetHealthScore);
router.get('/health-dashboard', intelligenceController.getHealthDashboard);

/**
 * Module 6: Criticality Index
 */
router.get('/criticality/:assetId', intelligenceController.getCriticalityScore);
router.get('/criticality-leaderboard', intelligenceController.getCriticalityLeaderboard);

/**
 * Module 5: Risk Prediction Engine
 */
router.get('/risk-prediction/:assetId', intelligenceController.generateRiskPredictions);
router.get('/risk-metrics', intelligenceController.getRiskMetrics);

/**
 * Module 7: Priority Ranking Engine
 */
router.get('/priority-ranking', intelligenceController.getPriorityRanking);
router.get('/priority-ranking/:assetId', intelligenceController.getAssetPriority);
router.get('/maintenance-schedule', intelligenceController.getMaintenanceSchedule);

/**
 * Module 12: Fraud & Anomaly Detection
 */
router.get('/fraud-detection', intelligenceController.detectFrauds);
router.get('/fraud-summary', intelligenceController.getFraudSummary);

/**
 * Module 13: Root Cause Analysis
 */
router.post('/root-cause-analysis', intelligenceController.analyzeRootCause);

/**
 * Module 14: Climate Risk Analysis
 */
router.get('/climate-risk/:assetId', intelligenceController.assessClimateRisks);
router.get('/climate-analysis-district', intelligenceController.getDistrictClimateAnalysis);

/**
 * Module 8: Budget Simulation Engine
 */
router.post('/budget-simulation', intelligenceController.runBudgetSimulation);
router.post('/compare-scenarios', intelligenceController.compareScenarios);

/**
 * Module 15: Emergency Response Optimization
 */
router.post('/emergency-response', intelligenceController.generateEmergencyResponse);
router.post('/track-emergency', intelligenceController.trackEmergency);

/**
 * Module 16: Infrastructure Equity Analysis
 */
router.get('/equity-analysis', intelligenceController.analyzeEquity);
router.get('/equity-scorecard', intelligenceController.getEquityScorecard);

/**
 * Unified Dashboard & Reports
 */
router.get('/comprehensive-dashboard', intelligenceController.getComprehensiveDashboard);
router.get('/comprehensive-report', intelligenceController.getComprehensiveReport);

module.exports = router;
