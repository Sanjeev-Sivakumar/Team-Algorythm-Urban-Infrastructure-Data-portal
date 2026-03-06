/**
 * Infrastructure Health Scoring Engine (Module 4)
 * Calculates comprehensive health scores for assets based on multiple factors
 * Score: 0-100 (Green=76-100, Yellow=51-75, Red=0-50)
 */

const pool = require('../config/db');

class HealthScoringService {
    /**
     * Calculate comprehensive health score for an asset
     * Factors: maintenance frequency, incident history, budget delay, asset age, risk prediction
     */
    async calculateAssetHealthScore(assetId) {
        try {
            const asset = await pool.query('SELECT * FROM assets WHERE id = $1', [assetId]);
            if (asset.rows.length === 0) throw new Error('Asset not found');

            const assetData = asset.rows[0];
            const weights = {
                maintenance: 0.25,      // 25% - Recent maintenance activity
                incidents: 0.20,        // 20% - Incident history
                budget: 0.15,           // 15% - Budget adequacy
                age: 0.25,              // 25% - Asset age
                risk: 0.15              // 15% - Risk prediction
            };

            // 1. Maintenance Score (0-100)
            const maintenanceScore = await this.calculateMaintenanceScore(assetId);

            // 2. Incidents Score (0-100)
            const incidentsScore = await this.calculateIncidentsScore(assetId);

            // 3. Budget Score (0-100)
            const budgetScore = await this.calculateBudgetScore(assetId);

            // 4. Age Score (0-100)
            const ageScore = await this.calculateAgeScore(assetData.installation_date);

            // 5. Risk Score (0-100)
            const riskScore = await this.calculateRiskScore(assetId);

            // Calculate weighted health score
            const healthScore = Math.round(
                (maintenanceScore * weights.maintenance) +
                (incidentsScore * weights.incidents) +
                (budgetScore * weights.budget) +
                (ageScore * weights.age) +
                (riskScore * weights.risk)
            );

            // Determine status
            let status = 'Good';
            if (healthScore >= 76) status = 'Good';
            else if (healthScore >= 51) status = 'Moderate';
            else status = 'Critical';

            return {
                assetId,
                healthScore,
                status,
                scores: {
                    maintenance: { value: maintenanceScore, weight: weights.maintenance },
                    incidents: { value: incidentsScore, weight: weights.incidents },
                    budget: { value: budgetScore, weight: weights.budget },
                    age: { value: ageScore, weight: weights.age },
                    risk: { value: riskScore, weight: weights.risk }
                },
                factors: await this.getScoreFactors(assetId, maintenanceScore, incidentsScore, budgetScore, ageScore, riskScore)
            };
        } catch (error) {
            throw new Error(`Health scoring error: ${error.message}`);
        }
    }

    /**
     * Maintenance Score: Recent maintenance activity (100 = well maintained)
     */
    async calculateMaintenanceScore(assetId) {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as maintenance_count,
                    MAX(maintenance_date) as last_maintenance_date
                FROM maintenance_schedule
                WHERE asset_id = $1 AND status = 'Completed'
                AND maintenance_date > CURRENT_DATE - INTERVAL '2 years'
            `, [assetId]);

            const data = result.rows[0];
            let score = 50;

            if (data.maintenance_count > 0 && data.last_maintenance_date) {
                const daysSinceMaintenance = Math.floor(
                    (new Date() - new Date(data.last_maintenance_date)) / (1000 * 60 * 60 * 24)
                );

                if (daysSinceMaintenance < 90) score = 100;
                else if (daysSinceMaintenance < 180) score = 85;
                else if (daysSinceMaintenance < 365) score = 70;
                else if (daysSinceMaintenance < 730) score = 50;
                else score = 30;

                if (data.maintenance_count > 4) score = Math.min(100, score + 10);
            }

            return Math.min(100, Math.max(0, score));
        } catch (error) {
            console.error('Maintenance score calculation error:', error);
            return 50;
        }
    }

    /**
     * Incidents Score: History of complaints/failures
     */
    async calculateIncidentsScore(assetId) {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total_incidents,
                    SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved_count,
                    MAX(created_at) as recent_incident
                FROM complaints
                WHERE asset_type = (SELECT type FROM assets WHERE id = $1)
                AND created_at > CURRENT_DATE - INTERVAL '2 years'
            `, [assetId]);

            const data = result.rows[0];
            let score = 100; // Base perfect score

            if (data.total_incidents > 0) {
                // More incidents = lower score
                const resolvedRate = data.total_incidents > 0 ? 
                    (data.resolved_count / data.total_incidents) * 100 : 0;

                score = resolvedRate > 90 ? 80 : 
                        resolvedRate > 75 ? 65 : 
                        resolvedRate > 50 ? 50 : 30;

                // Penalty for frequency
                const penalty = Math.min(40, data.total_incidents * 5);
                score = Math.max(10, score - penalty);
            }

            return Math.min(100, Math.max(0, score));
        } catch (error) {
            console.error('Incidents score calculation error:', error);
            return 75;
        }
    }

    /**
     * Budget Score: Budget adequacy and payment timeliness
     */
    async calculateBudgetScore(assetId) {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as complaint_count,
                    AVG(estimated_cost) as avg_estimated,
                    AVG(CASE WHEN approved_cost IS NOT NULL THEN approved_cost ELSE 0 END) as avg_approved,
                    SUM(CASE WHEN approved_cost IS NULL AND approval_status = 'Pending' THEN 1 ELSE 0 END) as pending_approvals
                FROM complaints
                WHERE asset_type = (SELECT type FROM assets WHERE id = $1)
                AND created_at > CURRENT_DATE - INTERVAL '1 year'
            `, [assetId]);

            const data = result.rows[0];
            let score = 100;

            if (data.complaint_count > 0) {
                if (data.avg_approved && data.avg_estimated) {
                    const approvalRate = (data.avg_approved / data.avg_estimated) * 100;
                    score = approvalRate > 95 ? 100 :
                            approvalRate > 80 ? 85 :
                            approvalRate > 60 ? 70 : 50;
                }
                // Penalty for pending approvals
                const pendingPenalty = Math.min(30, data.pending_approvals * 10);
                score = Math.max(20, score - pendingPenalty);
            }

            return Math.min(100, Math.max(0, score));
        } catch (error) {
            console.error('Budget score calculation error:', error);
            return 75;
        }
    }

    /**
     * Age Score: Asset age factor (newer = higher score)
     */
    async calculateAgeScore(installationDate) {
        if (!installationDate) return 75;

        try {
            const ageYears = (new Date() - new Date(installationDate)) / (1000 * 60 * 60 * 24 * 365);
            let score = 100;

            if (ageYears < 2) score = 100;
            else if (ageYears < 5) score = 90;
            else if (ageYears < 10) score = 75;
            else if (ageYears < 20) score = 60;
            else score = Math.max(20, 100 - (ageYears * 2));

            return Math.min(100, Math.max(20, score));
        } catch (error) {
            console.error('Age score calculation error:', error);
            return 60;
        }
    }

    /**
     * Risk Score: Based on ML predictions
     */
    async calculateRiskScore(assetId) {
        try {
            const result = await pool.query(`
                SELECT failure_probability, confidence_score
                FROM ml_predictions
                WHERE asset_id = $1
                ORDER BY created_at DESC
                LIMIT 1
            `, [assetId]);

            if (result.rows.length === 0) return 75;

            const { failure_probability, confidence_score } = result.rows[0];
            // Lower failure probability = higher score
            let score = 100 - (failure_probability * 100 * (confidence_score || 0.8));
            return Math.min(100, Math.max(20, score));
        } catch (error) {
            console.error('Risk score calculation error:', error);
            return 70;
        }
    }

    /**
     * Get factors contributing to the score
     */
    async getScoreFactors(assetId, maintScore, incScore, budScore, ageScore, riskScore) {
        const factors = [];

        if (maintScore < 60) {
            factors.push({
                factor: 'Maintenance',
                impact: 'negative',
                description: 'Maintenance is overdue or infrequent',
                recommendation: 'Schedule immediate maintenance'
            });
        }

        if (incScore < 60) {
            factors.push({
                factor: 'High Incident Rate',
                impact: 'negative',
                description: 'Multiple unresolved complaints',
                recommendation: 'Prioritize complaint resolution'
            });
        }

        if (budScore < 60) {
            factors.push({
                factor: 'Budget Constraints',
                impact: 'negative',
                description: 'Insufficient budget allocation',
                recommendation: 'Request budget enhancement'
            });
        }

        if (riskScore < 60) {
            factors.push({
                factor: 'High Failure Risk',
                impact: 'negative',
                description: 'ML model predicts high failure probability',
                recommendation: 'Conduct preventive maintenance'
            });
        }

        if (maintScore > 80) {
            factors.push({
                factor: 'Well Maintained',
                impact: 'positive',
                description: 'Regular maintenance schedule maintained',
                recommendation: 'Continue current maintenance program'
            });
        }

        return factors;
    }

    /**
     * Get health scores for multiple assets (bulk)
     */
    async getAssetsHealthBulk(assetIds) {
        const scores = [];
        for (const id of assetIds) {
            try {
                const score = await this.calculateAssetHealthScore(id);
                scores.push(score);
            } catch (error) {
                console.error(`Error calculating health score for asset ${id}:`, error);
            }
        }
        return scores;
    }

    /**
     * Get health distribution across all assets
     */
    async getHealthDistribution() {
        try {
            const result = await pool.query('SELECT id FROM assets');
            const assetIds = result.rows.map(r => r.id);

            const scores = await this.getAssetsHealthBulk(assetIds);

            const distribution = {
                good: scores.filter(s => s.healthScore >= 76).length,
                moderate: scores.filter(s => s.healthScore >= 51 && s.healthScore < 76).length,
                critical: scores.filter(s => s.healthScore < 51).length,
                averageScore: Math.round(scores.reduce((sum, s) => sum + s.healthScore, 0) / scores.length),
                scores
            };

            return distribution;
        } catch (error) {
            throw new Error(`Health distribution calculation error: ${error.message}`);
        }
    }
}

module.exports = new HealthScoringService();
