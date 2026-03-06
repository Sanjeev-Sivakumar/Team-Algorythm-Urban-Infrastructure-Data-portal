/**
 * InfraBrain AI - Intelligence Controller
 * Unified endpoint for all AI/ML engines (Modules 4-16)
 */

const healthScoring = require('../services/healthScoringService');
const criticalityIndex = require('../services/criticalityIndexService');
const riskPrediction = require('../services/riskPredictionService');
const priorityRanking = require('../services/priorityRankingService');
const fraudDetection = require('../services/fraudDetectionService');
const rootCauseAnalysis = require('../services/rootCauseService');
const climateRisk = require('../services/climateRiskService');
const budgetSimulation = require('../services/budgetSimulationService');
const emergencyResponse = require('../services/emergencyResponseService');
const equityAnalysis = require('../services/equityAnalysisService');
const pool = require('../config/db');

class IntelligenceController {
    /**
     * Module 4: Health Scoring
     */
    async getAssetHealthScore(req, res) {
        try {
            const { assetId } = req.params;
            const healthScore = await healthScoring.calculateAssetHealthScore(assetId);
            res.json({ success: true, data: healthScore });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getHealthDashboard(req, res) {
        try {
            const distribution = await healthScoring.getHealthDistribution();
            res.json({ success: true, data: distribution });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Module 6: Criticality Index
     */
    async getCriticalityScore(req, res) {
        try {
            const { assetId } = req.params;
            const score = await criticalityIndex.calculateCriticalityScore(assetId);
            res.json({ success: true, data: score });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getCriticalityLeaderboard(req, res) {
        try {
            const limit = req.query.limit || 20;
            const leaderboard = await criticalityIndex.getCriticalityLeaderboard(limit);
            res.json({ success: true, data: leaderboard });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Module 5: Risk Prediction
     */
    async generateRiskPredictions(req, res) {
        try {
            const { assetId } = req.params;
            const predictions = await riskPrediction.generateRiskPredictions(assetId);
            res.json({ success: true, data: predictions });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getRiskMetrics(req, res) {
        try {
            const metrics = await riskPrediction.getRiskMetrics();
            res.json({ success: true, data: metrics });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Module 7: Priority Ranking
     */
    async getPriorityRanking(req, res) {
        try {
            const ranking = await priorityRanking.generatePriorityRanking();
            res.json({ success: true, data: ranking });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getAssetPriority(req, res) {
        try {
            const { assetId } = req.params;
            const priority = await priorityRanking.calculatePriorityScore(assetId);
            res.json({ success: true, data: priority });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getMaintenanceSchedule(req, res) {
        try {
            const schedule = await priorityRanking.getMaintenanceSchedule();
            res.json({ success: true, data: schedule });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Module 12: Fraud Detection
     */
    async detectFrauds(req, res) {
        try {
            const fraudReport = await fraudDetection.detectFraudPatterns();
            res.json({ success: true, data: fraudReport });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getFraudSummary(req, res) {
        try {
            const summary = await fraudDetection.getFraudSummary();
            res.json({ success: true, data: summary });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Module 13: Root Cause Analysis
     */
    async analyzeRootCause(req, res) {
        try {
            const { assetId, failureDate } = req.body;
            const analysis = await rootCauseAnalysis.analyzeAssetFailure(
                assetId,
                failureDate || new Date()
            );
            res.json({ success: true, data: analysis });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Module 14: Climate Risk Analysis
     */
    async assessClimateRisks(req, res) {
        try {
            const { assetId } = req.params;
            const assessment = await climateRisk.assessClimateRisks(assetId);
            res.json({ success: true, data: assessment });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getDistrictClimateAnalysis(req, res) {
        try {
            const analysis = await climateRisk.getDistrictClimateAnalysis();
            res.json({ success: true, data: analysis });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Module 8: Budget Simulation
     */
    async runBudgetSimulation(req, res) {
        try {
            const { scenario } = req.body;
            if (!scenario) {
                return res.status(400).json({ success: false, error: 'Scenario required' });
            }

            const result = await budgetSimulation.runSimulation(scenario);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async compareScenarios(req, res) {
        try {
            const { scenarios } = req.body;
            if (!scenarios || !Array.isArray(scenarios)) {
                return res.status(400).json({ success: false, error: 'Scenarios array required' });
            }

            const comparison = await budgetSimulation.compareScenarios(scenarios);
            res.json({ success: true, data: comparison });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Module 15: Emergency Response
     */
    async generateEmergencyResponse(req, res) {
        try {
            const { assetId, failureType } = req.body;
            if (!assetId || !failureType) {
                return res.status(400).json({ success: false, error: 'AssetId and failureType required' });
            }

            const response = await emergencyResponse.generateEmergencyResponse(assetId, failureType);
            res.json({ success: true, data: response });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async trackEmergency(req, res) {
        try {
            const { emergencyId, status } = req.body;
            const track = await emergencyResponse.trackEmergencyResponse(emergencyId, status);
            res.json({ success: true, data: track });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Module 16: Equity Analysis
     */
    async analyzeEquity(req, res) {
        try {
            const analysis = await equityAnalysis.analyzeEquity();
            res.json({ success: true, data: analysis });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getEquityScorecard(req, res) {
        try {
            const scorecard = await equityAnalysis.generateEquityScorecard();
            res.json({ success: true, data: scorecard });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Unified Dashboard - All Core Metrics
     */
    async getComprehensiveDashboard(req, res) {
        try {
            const [
                healthData,
                criticalityData,
                riskData,
                priorityData,
                fraudData,
                equityData
            ] = await Promise.all([
                healthScoring.getHealthDistribution(),
                criticalityIndex.getCriticalityDistribution(),
                riskPrediction.getRiskMetrics(),
                priorityRanking.generatePriorityRanking(),
                fraudDetection.getFraudSummary(),
                equityAnalysis.generateEquityScorecard()
            ]);

            const dashboard = {
                timestamp: new Date(),
                modules: {
                    healthScoring: {
                        name: 'Infrastructure Health Scoring',
                        score: healthData.averageScore,
                        distribution: {
                            good: healthData.good,
                            moderate: healthData.moderate,
                            critical: healthData.critical
                        }
                    },
                    criticalityIndex: {
                        name: 'Infrastructure Criticality Index',
                        critical: criticalityData.critical,
                        high: criticalityData.high,
                        medium: criticalityData.medium,
                        low: criticalityData.low,
                        averageCriticality: criticalityData.averageCriticality
                    },
                    riskPrediction: {
                        name: 'Risk Prediction Engine',
                        averageRisk: riskData.averageRisk,
                        distribution: riskData.riskDistribution
                    },
                    priorityRanking: {
                        name: 'Smart Priority Ranking',
                        urgent: priorityData.summary.urgent,
                        planned: priorityData.summary.planned,
                        preventative: priorityData.summary.preventative
                    },
                    fraudDetection: {
                        name: 'Fraud & Anomaly Detection',
                        totalAlerts: fraudData.totalAlerts,
                        criticalAlerts: fraudData.critical,
                        fraudRisk: fraudData.estimatedFraudRisk
                    },
                    equityAnalysis: {
                        name: 'Infrastructure Equity Analysis',
                        overallEquity: equityData.overallStatus,
                        equityScore: equityData.overallEquityScore
                    }
                },
                actionItems: await this.generateDashboardActionItems(
                    healthData,
                    criticalityData,
                    fraudData,
                    equityData
                )
            };

            res.json({ success: true, data: dashboard });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Generate action items for dashboard
     */
    async generateDashboardActionItems(health, criticality, fraud, equity) {
        const items = [];

        if (health.critical > 10) {
            items.push({
                priority: 'Critical',
                action: `${health.critical} assets in critical condition`,
                module: 'Health Scoring',
                recommendation: 'Immediate maintenance required'
            });
        }

        if (criticality.critical > 5) {
            items.push({
                priority: 'High',
                action: `${criticality.critical} critical infrastructure assets identified`,
                module: 'Criticality Index',
                recommendation: 'Review priority ranking'
            });
        }

        if (fraud.critical > 0) {
            items.push({
                priority: 'Critical',
                action: `${fraud.critical} critical fraud alerts detected`,
                module: 'Fraud Detection',
                recommendation: 'Immediate investigation required'
            });
        }

        if (equity.overallEquityScore < 60) {
            items.push({
                priority: 'High',
                action: 'Infrastructure equity imbalance detected',
                module: 'Equity Analysis',
                recommendation: 'Review budget distribution'
            });
        }

        return items.length > 0 ? items : [{
            priority: 'Low',
            action: 'System operating normally',
            module: 'Overall',
            recommendation: 'Continue monitoring'
        }];
    }

    /**
     * Get report - comprehensive analysis document
     */
    async getComprehensiveReport(req, res) {
        try {
            const reportType = req.query.type || 'full';

            const report = {
                reportDate: new Date(),
                reportType,
                executiveSummary: 'InfraBrain AI Comprehensive Infrastructure Governance Report',
                generatedBy: 'InfraBrain AI System'
            };

            if (reportType === 'full' || reportType === 'health') {
                report.healthScoring = await healthScoring.getHealthDistribution();
            }

            if (reportType === 'full' || reportType === 'criticality') {
                report.criticalityAnalysis = await criticalityIndex.getCriticalityDistribution();
            }

            if (reportType === 'full' || reportType === 'risk') {
                report.riskAnalysis = await riskPrediction.getRiskMetrics();
            }

            if (reportType === 'full' || reportType === 'fraud') {
                report.fraudAnalysis = await fraudDetection.getFraudSummary();
            }

            if (reportType === 'full' || reportType === 'equity') {
                report.equityAnalysis = await equityAnalysis.generateEquityScorecard();
            }

            res.json({ success: true, data: report });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new IntelligenceController();
