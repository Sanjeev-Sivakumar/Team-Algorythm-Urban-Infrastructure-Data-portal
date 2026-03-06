/**
 * Root Cause Analysis Engine (Module 13)
 * When asset fails, analyzes why and generates detailed reports
 * Identifies: maintenance delays, budget shortage, contractor issues
 */

const pool = require('../config/db');

class RootCauseAnalysisService {
    /**
     * Analyze root cause of asset failure
     */
    async analyzeAssetFailure(assetId, failureDate) {
        try {
            const asset = await pool.query('SELECT * FROM assets WHERE id = $1', [assetId]);
            if (asset.rows.length === 0) throw new Error('Asset not found');

            const assetData = asset.rows[0];

            const analysis = {
                assetId,
                assetName: assetData.name,
                assetType: assetData.type,
                failureDate,
                analysisDate: new Date(),
                primaryCause: await this.determinePrimaryCause(assetId, assetData, failureDate),
                contributingFactors: await this.identifyContributingFactors(assetId, assetData, failureDate),
                timeline: await this.buildFailureTimeline(assetId, failureDate),
                preventionRecommendations: await this.generatePreventionRecommendations(assetId, assetData),
                report: await this.generateRootCauseReport(assetId, assetData)
            };

            return analysis;
        } catch (error) {
            throw new Error(`Root cause analysis error: ${error.message}`);
        }
    }

    /**
     * Determine the primary cause of failure
     */
    async determinePrimaryCause(assetId, assetData, failureDate) {
        try {
            // Check maintenance status
            const maintenanceStatus = await this.analyzeMaintenance(assetId, failureDate);
            const budgetStatus = await this.analyzeBudget(assetId, failureDate);
            const contractorStatus = await this.analyzeContractor(assetId, failureDate);
            const ageStatus = await this.analyzeAssetAge(assetData);
            const infraStatus = await this.analyzeInfrastructureIssues(assetId, failureDate);

            // Rank causes by impact
            const causes = [
                { cause: 'Deferred Maintenance', impact: maintenanceStatus.score, details: maintenanceStatus },
                { cause: 'Budget Constraints', impact: budgetStatus.score, details: budgetStatus },
                { cause: 'Poor Contractor Performance', impact: contractorStatus.score, details: contractorStatus },
                { cause: 'Asset Age/Degradation', impact: ageStatus.score, details: ageStatus },
                { cause: 'Infrastructure/Environmental', impact: infraStatus.score, details: infraStatus }
            ];

            causes.sort((a, b) => b.impact - a.impact);

            return {
                cause: causes[0].cause,
                confidence: Math.round(causes[0].impact * 100) / 100,
                details: causes[0].details,
                topThreeCauses: causes.slice(0, 3).map(c => ({
                    cause: c.cause,
                    confidence: Math.round(c.impact * 100) / 100
                }))
            };
        } catch (error) {
            console.error('Primary cause determination error:', error);
            return { cause: 'Unknown', confidence: 0, details: {} };
        }
    }

    /**
     * Analyze maintenance as cause
     */
    async analyzeMaintenance(assetId, failureDate) {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total_maintenance,
                    MAX(maintenance_date) as last_maintenance,
                    SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) as overdue_count,
                    SUM(CASE WHEN status != 'Completed' THEN 1 ELSE 0 END) as incomplete_count
                FROM maintenance_schedule
                WHERE asset_id = $1 AND maintenance_date < $2
            `, [assetId, failureDate]);

            const data = result.rows[0];
            const daysSinceLastMaint = data.last_maintenance ?
                Math.floor((new Date(failureDate) - new Date(data.last_maintenance)) / (1000 * 60 * 60 * 24)) :
                99999;

            let score = 0;

            if (daysSinceLastMaint > 365) score = 0.9;  // Over a year - likely cause
            else if (daysSinceLastMaint > 180) score = 0.7;
            else if (daysSinceLastMaint > 90) score = 0.4;
            else score = 0.1;

            // Increase score if maintenance was overdue
            if (data.overdue_count > 0) score = Math.min(1, score + 0.15);
            if (data.incomplete_count > 0) score = Math.min(1, score + 0.1);

            return {
                score,
                daysSinceLastMaintenance: daysSinceLastMaint,
                totalMaintenanceEvents: data.total_maintenance,
                overdueEvents: data.overdue_count,
                incompleteEvents: data.incomplete_count,
                assessment: daysSinceLastMaint > 365 ? 'Critical - Severely deferred maintenance' : 'Maintenance status requires review'
            };
        } catch (error) {
            console.error('Maintenance analysis error:', error);
            return { score: 0.3, assessment: 'Unable to determine' };
        }
    }

    /**
     * Analyze budget constraints as cause
     */
    async analyzeBudget(assetId, failureDate) {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN approval_status = 'Pending' THEN estimated_cost ELSE 0 END) as pending_budget,
                    SUM(CASE WHEN approval_status = 'Rejected' THEN estimated_cost ELSE 0 END) as rejected_budget,
                    SUM(CASE WHEN approval_status = 'Approved' THEN approved_cost ELSE 0 END) as approved_budget
                FROM complaints
                WHERE asset_type = (SELECT type FROM assets WHERE id = $1)
                AND created_at < $2
            `, [assetId, failureDate]);

            const data = result.rows[0];
            const pendingBudget = parseFloat(data.pending_budget) || 0;
            const rejectedBudget = parseFloat(data.rejected_budget) || 0;

            let score = 0;

            if (rejectedBudget > 1000000) score = 0.85; // Over 1M rejected - likely cause
            else if (rejectedBudget > 500000) score = 0.6;
            else if (rejectedBudget > 100000) score = 0.3;

            if (pendingBudget > 500000) score = Math.min(1, score + 0.2);

            return {
                score,
                totalRequests: data.total_requests,
                pendingBudget,
                rejectedBudget,
                approvedBudget: parseFloat(data.approved_budget) || 0,
                assessment: rejectedBudget > 500000 ? 'Severe - Budget shortage likely factor' : 'Check budget approval records'
            };
        } catch (error) {
            console.error('Budget analysis error:', error);
            return { score: 0.2, assessment: 'Unable to determine' };
        }
    }

    /**
     * Analyze contractor performance as cause
     */
    async analyzeContractor(assetId, failureDate) {
        try {
            const result = await pool.query(`
                SELECT performed_by, COUNT(*) as job_count,
                       SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) as overdue_jobs
                FROM maintenance_schedule
                WHERE asset_id = $1 AND maintenance_date < $2
                GROUP BY performed_by
                ORDER BY overdue_jobs DESC
                LIMIT 1
            `, [assetId, failureDate]);

            if (result.rows.length === 0) {
                return { score: 0.1, assessment: 'No specific contractor identified' };
            }

            const data = result.rows[0];
            const overdueRate = (data.overdue_jobs / data.job_count) * 100;

            let score = 0;

            if (overdueRate > 50) score = 0.8;
            else if (overdueRate > 20) score = 0.5;
            else if (overdueRate > 0) score = 0.2;

            return {
                score,
                contractor: data.performed_by,
                totalJobs: data.job_count,
                overdueJobs: data.overdue_jobs,
                overdueRate: Math.round(overdueRate),
                assessment: overdueRate > 20 ? 'Likely - Contractor performance issues' : 'Minor contractor issues'
            };
        } catch (error) {
            console.error('Contractor analysis error:', error);
            return { score: 0.15, assessment: 'Unable to determine' };
        }
    }

    /**
     * Analyze asset age/degradation
     */
    async analyzeAssetAge(assetData) {
        try {
            if (!assetData.installation_date) {
                return { score: 0.3, assessment: 'Installation date unknown' };
            }

            const ageYears = (new Date() - new Date(assetData.installation_date)) / (1000 * 60 * 60 * 24 * 365);

            let score = 0;

            if (ageYears > 30) score = 0.9;
            else if (ageYears > 20) score = 0.75;
            else if (ageYears > 15) score = 0.6;
            else if (ageYears > 10) score = 0.4;
            else if (ageYears > 5) score = 0.2;

            const expectedLifespan = {
                'Road': 15,
                'Bridge': 50,
                'Water Pipeline': 40,
                'Sewage': 40,
                'Building': 50,
                'Electricity': 30,
                'Street Light': 20
            };

            const lifespan = expectedLifespan[assetData.type] || 20;
            const lifeUsed = Math.round((ageYears / lifespan) * 100);

            return {
                score,
                ageYears: Math.round(ageYears),
                expectedLifespan: lifespan,
                percentLifeUsed: lifeUsed,
                assessment: lifeUsed > 80 ? `Asset at ${lifeUsed}% of expected life` : `Asset has ${100 - lifeUsed}% of life remaining`
            };
        } catch (error) {
            console.error('Age analysis error:', error);
            return { score: 0.2, assessment: 'Unable to determine' };
        }
    }

    /**
     * Analyze infrastructure/environmental issues
     */
    async analyzeInfrastructureIssues(assetId, failureDate) {
        try {
            const result = await pool.query(`
                SELECT * FROM climate_assessments
                WHERE asset_id = $1
                ORDER BY assessment_date DESC LIMIT 1
            `, [assetId]);

            if (result.rows.length === 0) {
                return { score: 0.2, assessment: 'No climate data available' };
            }

            const climate = result.rows[0];
            let score = 0;

            if (climate.flood_risk > 0.7) score = Math.max(score, 0.7);
            if (climate.heat_vulnerability > 0.8) score = Math.max(score, 0.5);
            if (climate.environmental_impact > 0.7) score = Math.max(score, 0.4);

            return {
                score,
                floodRisk: Math.round(climate.flood_risk * 100),
                heatVulnerability: Math.round(climate.heat_vulnerability * 100),
                environmentalImpact: Math.round(climate.environmental_impact * 100),
                assessment: score > 0.6 ? 'Environmental/climate factors significant' : 'Minimal environmental impact'
            };
        } catch (error) {
            console.error('Infrastructure analysis error:', error);
            return { score: 0.1, assessment: 'Unable to determine' };
        }
    }

    /**
     * Identify contributing factors
     */
    async identifyContributingFactors(assetId, assetData, failureDate) {
        const factors = [];

        // Check multiple factors
        const maintenance = await this.analyzeMaintenance(assetId, failureDate);
        const budget = await this.analyzeBudget(assetId, failureDate);
        const contractor = await this.analyzeContractor(assetId, failureDate);
        const age = await this.analyzeAssetAge(assetData);

        if (maintenance.score > 0.5) {
            factors.push({ factor: 'Maintenance Backlog', score: maintenance.score });
        }
        if (budget.score > 0.5) {
            factors.push({ factor: 'Budget Constraints', score: budget.score });
        }
        if (contractor.score > 0.5) {
            factors.push({ factor: 'Contractor Issues', score: contractor.score });
        }
        if (age.score > 0.5) {
            factors.push({ factor: 'Asset Aging', score: age.score });
        }

        return factors.sort((a, b) => b.score - a.score);
    }

    /**
     * Build timeline of events leading to failure
     */
    async buildFailureTimeline(assetId, failureDate) {
        try {
            const timeline = [];

            // Get recent maintenance
            const maintenance = await pool.query(`
                SELECT maintenance_date, maintenance_type, status, cost
                FROM maintenance_schedule
                WHERE asset_id = $1 AND maintenance_date < $2
                ORDER BY maintenance_date DESC LIMIT 5
            `, [assetId, failureDate]);

            for (const m of maintenance.rows) {
                timeline.push({
                    date: m.maintenance_date,
                    event: `Maintenance: ${m.maintenance_type} (Status: ${m.status}, Cost: ${m.cost})`
                });
            }

            // Get recent complaints
            const complaints = await pool.query(`
                SELECT created_at, title, status
                FROM complaints
                WHERE asset_type = (SELECT type FROM assets WHERE id = $1)
                AND created_at < $2
                ORDER BY created_at DESC LIMIT 5
            `, [assetId, failureDate]);

            for (const c of complaints.rows) {
                timeline.push({
                    date: c.created_at,
                    event: `Complaint: ${c.title} (Status: ${c.status})`
                });
            }

            // Sort by date descending
            timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

            return timeline;
        } catch (error) {
            console.error('Timeline building error:', error);
            return [];
        }
    }

    /**
     * Generate prevention recommendations
     */
    async generatePreventionRecommendations(assetId, assetData) {
        const analysis = await this.determinePrimaryCause(assetId, assetData, new Date());

        const recommendations = [];

        if (analysis.cause === 'Deferred Maintenance') {
            recommendations.push({
                priority: 'Critical',
                action: 'Establish predictive maintenance schedule',
                details: 'Implement condition-based monitoring to prevent future failures'
            });
        }

        if (analysis.cause === 'Budget Constraints') {
            recommendations.push({
                priority: 'High',
                action: 'Increase budget allocation',
                details: 'Review and increase maintenance budget for this asset type'
            });
        }

        if (analysis.cause === 'Poor Contractor Performance') {
            recommendations.push({
                priority: 'High',
                action: 'Perform contractor audit and replacement',
                details: 'Review contractor SLA compliance and consider alternatives'
            });
        }

        if (analysis.cause === 'Asset Age/Degradation') {
            recommendations.push({
                priority: 'Medium',
                action: 'Plan asset replacement',
                details: 'Develop capital plan for asset renewal'
            });
        }

        return recommendations;
    }

    /**
     * Generate detailed root cause report
     */
    async generateRootCauseReport(assetId, assetData) {
        const report = {
            title: `Root Cause Analysis Report - ${assetData.name}`,
            assetDetails: {
                id: assetId,
                name: assetData.name,
                type: assetData.type,
                age: assetData.installation_date ?
                    Math.round((new Date() - new Date(assetData.installation_date)) / (1000 * 60 * 60 * 24 * 365)) :
                    'Unknown',
                installationDate: assetData.installation_date,
                currentStatus: assetData.status
            },
            generatedAt: new Date(),
            classification: 'Confidential - Infrastructure Analysis'
        };

        return report;
    }
}

module.exports = new RootCauseAnalysisService();
