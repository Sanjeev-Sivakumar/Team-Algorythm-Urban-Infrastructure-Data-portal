/**
 * Smart Priority Ranking Engine (Module 7)
 * Automatically ranks assets for repair based on health, criticality, and failure probability
 * Generates work order priorities
 */

const pool = require('../config/db');
const healthScoring = require('./healthScoringService');
const criticalityIndex = require('./criticalityIndexService');
const riskPrediction = require('./riskPredictionService');

class PriorityRankingService {
    /**
     * Generate priority ranking for all assets
     */
    async generatePriorityRanking() {
        try {
            const result = await pool.query('SELECT id FROM assets');
            const assetIds = result.rows.map(r => r.id);

            const priorityScores = [];

            for (const id of assetIds) {
                try {
                    const score = await this.calculatePriorityScore(id);
                    priorityScores.push(score);
                } catch (error) {
                    console.error(`Error calculating priority for asset ${id}:`, error);
                }
            }

            // Sort by priority score (highest = highest priority)
            priorityScores.sort((a, b) => b.priorityScore - a.priorityScore);

            return {
                ranking: priorityScores,
                urgentRepairs: priorityScores.filter(s => s.urgencyLevel === 'Urgent').slice(0, 10),
                plannedRepairs: priorityScores.filter(s => s.urgencyLevel === 'Planned').slice(0, 15),
                preventativeMaintenance: priorityScores.filter(s => s.urgencyLevel === 'Preventative').slice(0, 10),
                summary: this.generatePrioritySummary(priorityScores)
            };
        } catch (error) {
            throw new Error(`Priority ranking error: ${error.message}`);
        }
    }

    /**
     * Calculate priority score for a single asset
     * Combines health, criticality, and failure probability
     */
    async calculatePriorityScore(assetId) {
        try {
            // Get health score
            const healthScore = await healthScoring.calculateAssetHealthScore(assetId);
            const health = healthScore.healthScore; // 0-100

            // Get criticality score
            const criticalityScore = await criticalityIndex.calculateCriticalityScore(assetId);
            const criticality = criticalityScore.criticalityScore; // 0-100

            // Get risk prediction
            const predictions = await riskPrediction.generateRiskPredictions(assetId);
            const failureProbability = predictions.predictions.month_3.probability * 100; // 0-100

            // Get budget impact
            const budgetImpact = await this.calculateBudgetImpact(assetId);

            // Weighted priority calculation
            const priorityScore = 
                (100 - health) * 0.35 +          // Lower health = higher priority (35%)
                (criticality) * 0.30 +             // Higher criticality = higher priority (30%)
                (failureProbability) * 0.25 +     // Higher failure probability = higher priority (25%)
                (budgetImpact) * 0.10;             // Budget constraints factor (10%)

            // Determine urgency level
            let urgencyLevel = 'Routine';
            if (priorityScore >= 80) urgencyLevel = 'Urgent';
            else if (priorityScore >= 60) urgencyLevel = 'Planned';
            else if (priorityScore >= 40) urgencyLevel = 'Preventative';

            // Get asset details
            const assetResult = await pool.query('SELECT name, type, status FROM assets WHERE id = $1', [assetId]);
            const assetData = assetResult.rows[0];

            return {
                assetId,
                assetName: assetData.name,
                assetType: assetData.type,
                assetStatus: assetData.status,
                priorityScore: Math.round(priorityScore * 100) / 100,
                urgencyLevel,
                components: {
                    health: {
                        score: Math.round(health),
                        weight: 0.35,
                        contribution: Math.round((100 - health) * 0.35)
                    },
                    criticality: {
                        score: Math.round(criticality),
                        weight: 0.30,
                        contribution: Math.round(criticality * 0.30)
                    },
                    failureProbability: {
                        score: Math.round(failureProbability),
                        weight: 0.25,
                        contribution: Math.round(failureProbability * 0.25)
                    },
                    budget: {
                        score: Math.round(budgetImpact),
                        weight: 0.10,
                        contribution: Math.round(budgetImpact * 0.10)
                    }
                },
                workOrderPriority: this.generateWorkOrderPriority(assetId, urgencyLevel, priorityScore),
                estimatedTimeframe: this.getTimeframe(urgencyLevel),
                actionItems: await this.generateActionItems(assetId, urgencyLevel, healthScore, criticalityScore)
            };
        } catch (error) {
            console.error(`Error calculating priority score for asset ${assetId}:`, error);
            throw error;
        }
    }

    /**
     * Calculate budget impact factor
     */
    async calculateBudgetImpact(assetId) {
        try {
            const result = await pool.query(`
                SELECT 
                    SUM(CASE WHEN approval_status = 'Pending' THEN estimated_cost ELSE 0 END) as pending_costs,
                    SUM(CASE WHEN approval_status = 'Rejected' THEN estimated_cost ELSE 0 END) as rejected_costs
                FROM complaints
                WHERE asset_type = (SELECT type FROM assets WHERE id = $1)
                AND created_at > CURRENT_DATE - INTERVAL '1 year'
            `, [assetId]);

            const data = result.rows[0];
            const pendingCosts = parseFloat(data.pending_costs) || 0;
            const rejectedCosts = parseFloat(data.rejected_costs) || 0;

            // Normalize to 0-100
            const budgetConstraint = Math.min(100, ((pendingCosts + rejectedCosts) / 1000000) * 50);
            return budgetConstraint;
        } catch (error) {
            console.error('Budget impact calculation error:', error);
            return 0;
        }
    }

    /**
     * Generate work order from priority
     */
    generateWorkOrderPriority(assetId, urgencyLevel, priorityScore) {
        const workOrderMap = {
            'Urgent': { id: 1000 + assetId, status: 'Create Immediately' },
            'Planned': { id: 2000 + assetId, status: 'Schedule Within 2 Weeks' },
            'Preventative': { id: 3000 + assetId, status: 'Schedule Within 1 Month' },
            'Routine': { id: 4000 + assetId, status: 'Schedule as Capacity Allows' }
        };

        return workOrderMap[urgencyLevel] || workOrderMap['Routine'];
    }

    /**
     * Get estimated timeframe for repair
     */
    getTimeframe(urgencyLevel) {
        const timeframeMap = {
            'Urgent': '24-48 hours',
            'Planned': '1-2 weeks',
            'Preventative': '2-4 weeks',
            'Routine': '1-3 months'
        };

        return timeframeMap[urgencyLevel] || '1-3 months';
    }

    /**
     * Generate action items for asset
     */
    async generateActionItems(assetId, urgencyLevel, healthScore, criticalityScore) {
        const actionItems = [];

        // Based on urgency level
        if (urgencyLevel === 'Urgent') {
            actionItems.push({
                order: 1,
                action: 'Immediate Inspection',
                responsibility: 'Field Officer',
                timeframe: '24 hours'
            });
            actionItems.push({
                order: 2,
                action: 'Emergency Repair Request',
                responsibility: 'Maintenance Coordinator',
                timeframe: '24 hours'
            });
            actionItems.push({
                order: 3,
                action: 'Public Communication',
                responsibility: 'Communications',
                timeframe: 'Before repair work'
            });
        } else if (urgencyLevel === 'Planned') {
            actionItems.push({
                order: 1,
                action: 'Schedule Inspection',
                responsibility: 'Field Officer',
                timeframe: '3-5 days'
            });
            actionItems.push({
                order: 2,
                action: 'Prepare Work Order',
                responsibility: 'Maintenance Coordinator',
                timeframe: '3-5 days'
            });
            actionItems.push({
                order: 3,
                action: 'Contractor Assignment',
                responsibility: 'Procurement',
                timeframe: '1 week'
            });
        } else {
            actionItems.push({
                order: 1,
                action: 'Schedule Preventive Maintenance',
                responsibility: 'Maintenance Coordinator',
                timeframe: '2-3 weeks'
            });
        }

        // Based on health score
        if (healthScore.healthScore < 50) {
            actionItems.push({
                order: actionItems.length + 1,
                action: 'Condition Assessment Report',
                responsibility: 'Engineering Team',
                timeframe: 'Before maintenance'
            });
        }

        // Based on criticality
        if (criticalityScore.level === 'Critical') {
            actionItems.push({
                order: 1,
                action: 'Alert Department Head',
                responsibility: 'System Administrator',
                timeframe: 'Immediately'
            });
            actionItems.push({
                order: 2,
                action: 'Develop Contingency Plan',
                responsibility: 'Operations Manager',
                timeframe: '24 hours'
            });
        }

        return actionItems;
    }

    /**
     * Generate priority summary
     */
    generatePrioritySummary(priorityScores) {
        return {
            totalAssets: priorityScores.length,
            urgent: priorityScores.filter(s => s.urgencyLevel === 'Urgent').length,
            planned: priorityScores.filter(s => s.urgencyLevel === 'Planned').length,
            preventative: priorityScores.filter(s => s.urgencyLevel === 'Preventative').length,
            routine: priorityScores.filter(s => s.urgencyLevel === 'Routine').length,
            averagePriorityScore: Math.round(
                priorityScores.reduce((sum, s) => sum + s.priorityScore, 0) / priorityScores.length
            ),
            criticalAlertsCount: priorityScores.filter(s => 
                s.urgencyLevel === 'Urgent' && s.components.failureProbability.score > 70
            ).length
        };
    }

    /**
     * Get top N urgent repairs
     */
    async getTopUrgentRepairs(limit = 10) {
        try {
            const ranking = await this.generatePriorityRanking();
            return ranking.ranking
                .filter(r => r.urgencyLevel === 'Urgent')
                .slice(0, limit);
        } catch (error) {
            throw new Error(`Top urgent repairs error: ${error.message}`);
        }
    }

    /**
     * Get maintenance schedule based on priority
     */
    async getMaintenanceSchedule(sortBy = 'priority') {
        try {
            const ranking = await this.generatePriorityRanking();

            const schedule = {
                immediate: ranking.ranking.filter(r => r.urgencyLevel === 'Urgent').slice(0, 5),
                twoWeeks: ranking.ranking.filter(r => r.urgencyLevel === 'Planned').slice(0, 10),
                month: ranking.ranking.filter(r => r.urgencyLevel === 'Preventative').slice(0, 15),
                summary: ranking.summary
            };

            return schedule;
        } catch (error) {
            throw new Error(`Maintenance schedule error: ${error.message}`);
        }
    }

    /**
     * Auto-generate work orders for urgent assets
     */
    async autoGenerateWorkOrders() {
        try {
            const ranking = await this.generatePriorityRanking();
            const urgentRepairs = ranking.ranking.filter(r => r.urgencyLevel === 'Urgent');

            const workOrders = [];

            for (const repair of urgentRepairs) {
                const workOrder = {
                    asset_id: repair.assetId,
                    asset_name: repair.assetName,
                    work_order_id: repair.workOrderPriority.id,
                    priority: 'Urgent',
                    description: `Urgent repair needed: ${repair.assetName} (${repair.assetType})`,
                    estimated_duration: '2-3 days',
                    status: 'Generated',
                    created_at: new Date()
                };

                // Store in database if needed
                workOrders.push(workOrder);
            }

            return {
                totalGenerated: workOrders.length,
                workOrders
            };
        } catch (error) {
            throw new Error(`Work order generation error: ${error.message}`);
        }
    }
}

module.exports = new PriorityRankingService();
