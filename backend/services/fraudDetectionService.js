/**
 * AI Fraud & Anomaly Detection Layer (Module 12)
 * Detects suspicious patterns: fake invoices, duplicate entries, budget spikes, manipulated data
 */

const pool = require('../config/db');
const stats = require('simple-statistics');

class FraudDetectionService {
    /**
     * Detect fraudulent patterns in system
     */
    async detectFraudPatterns() {
        try {
            const fraudAlerts = [];

            // Check 1: Duplicate maintenance entries
            const duplicates = await this.detectDuplicateEntries();
            if (duplicates.length > 0) {
                fraudAlerts.push(...duplicates);
            }

            // Check 2: Suspicious budget spikes
            const budgetAnomalies = await this.detectBudgetAnomalies();
            if (budgetAnomalies.length > 0) {
                fraudAlerts.push(...budgetAnomalies);
            }

            // Check 3: Fake invoices/manipulation
            const invoiceFrauds = await this.detectInvoiceFrauds();
            if (invoiceFrauds.length > 0) {
                fraudAlerts.push(...invoiceFrauds);
            }

            // Check 4: Cost inflation patterns
            const costInflation = await this.detectCostInflation();
            if (costInflation.length > 0) {
                fraudAlerts.push(...costInflation);
            }

            // Check 5: Suspicious approvals
            const approvalAnomalies = await this.detectApprovalAnomalies();
            if (approvalAnomalies.length > 0) {
                fraudAlerts.push(...approvalAnomalies);
            }

            // Categorize by severity
            const fraudReport = {
                totalAlerts: fraudAlerts.length,
                criticalAlerts: fraudAlerts.filter(a => a.severity === 'Critical').length,
                highAlerts: fraudAlerts.filter(a => a.severity === 'High').length,
                mediumAlerts: fraudAlerts.filter(a => a.severity === 'Medium').length,
                alerts: fraudAlerts.sort((a, b) => {
                    const severityMap = { 'Critical': 3, 'High': 2, 'Medium': 1 };
                    return severityMap[b.severity] - severityMap[a.severity];
                })
            };

            return fraudReport;
        } catch (error) {
            throw new Error(`Fraud detection error: ${error.message}`);
        }
    }

    /**
     * Detect duplicate maintenance entries
     */
    async detectDuplicateEntries() {
        try {
            const result = await pool.query(`
                SELECT asset_id, maintenance_date, cost, performed_by,
                       COUNT(*) as count
                FROM maintenance_schedule
                WHERE maintenance_date > CURRENT_DATE - INTERVAL '1 year'
                GROUP BY asset_id, maintenance_date, cost, performed_by
                HAVING COUNT(*) > 1
            `);

            const duplicates = [];

            for (const row of result.rows) {
                duplicates.push({
                    type: 'Duplicate Maintenance Entry',
                    severity: 'High',
                    description: `Asset ${row.asset_id} has ${row.count} identical maintenance entries on ${row.maintenance_date}`,
                    details: `Date: ${row.maintenance_date}, Cost: ${row.cost}, Performed by: ${row.performed_by}`,
                    riskFactor: row.count * row.cost,
                    recommendation: 'Verify entries and remove duplicates',
                    flagged: true
                });
            }

            return duplicates;
        } catch (error) {
            console.error('Duplicate detection error:', error);
            return [];
        }
    }

    /**
     * Detect suspicious budget spikes
     */
    async detectBudgetAnomalies() {
        try {
            const result = await pool.query(`
                SELECT asset_id, 
                       DATE_TRUNC('month', maintenance_date)::DATE as month,
                       SUM(cost) as monthly_cost,
                       COUNT(*) as transaction_count
                FROM maintenance_schedule
                WHERE maintenance_date > CURRENT_DATE - INTERVAL '2 years'
                GROUP BY asset_id, month
                ORDER BY monthly_cost DESC
            `);

            if (result.rows.length < 3) return [];

            const anomalies = [];
            const costs = result.rows.map(r => r.monthly_cost);
            const mean = stats.mean(costs);
            const stdDev = stats.standardDeviation(costs);

            for (const row of result.rows) {
                // Flag if spike is > 2 standard deviations above mean
                if (row.monthly_cost > mean + (2 * stdDev)) {
                    anomalies.push({
                        type: 'Suspicious Budget Spike',
                        severity: row.monthly_cost > mean + (3 * stdDev) ? 'Critical' : 'High',
                        description: `Unusual spending spike for asset ${row.asset_id} in ${row.month}`,
                        details: `Amount: ${row.monthly_cost}, Average: ${Math.round(mean)}, Transactions: ${row.transaction_count}`,
                        riskFactor: Math.round((row.monthly_cost / mean - 1) * 100),
                        recommendation: 'Verify invoices and approve vendor legitimacy',
                        flagged: true
                    });
                }
            }

            return anomalies;
        } catch (error) {
            console.error('Budget anomaly detection error:', error);
            return [];
        }
    }

    /**
     * Detect fake invoices or manipulated costs
     */
    async detectInvoiceFrauds() {
        try {
            const result = await pool.query(`
                SELECT c.id, c.estimated_cost, c.approved_cost, c.title, 
                       c.asset_type, c.created_at
                FROM complaints c
                WHERE c.approval_status = 'Approved'
                AND c.approved_cost IS NOT NULL
                AND c.created_at > CURRENT_DATE - INTERVAL '1 year'
            `);

            const frauds = [];

            for (const row of result.rows) {
                const escalation = (row.approved_cost / row.estimated_cost - 1) * 100;

                // Flag if cost increased by more than 50%
                if (escalation > 50) {
                    frauds.push({
                        type: 'Cost Escalation Anomaly',
                        severity: escalation > 100 ? 'Critical' : 'High',
                        description: `Complaint ${row.id}: Cost jumped ${Math.round(escalation)}% after approval`,
                        details: `Estimated: ${row.estimated_cost}, Approved: ${row.approved_cost}, Asset: ${row.asset_type}`,
                        riskFactor: escalation,
                        recommendation: 'Review invoice details and contractor credentials',
                        flagged: true
                    });
                }

                // Flag suspiciously round numbers (possible fake invoices)
                if (this.isSuspiciouslyRound(row.approved_cost)) {
                    frauds.push({
                        type: 'Suspicious Round Invoice Amount',
                        severity: 'Medium',
                        description: `Complaint ${row.id}: Invoice amount is suspiciously round`,
                        details: `Amount: ${row.approved_cost} (${row.asset_type})`,
                        riskFactor: Math.round(row.approved_cost),
                        recommendation: 'Request detailed itemization of invoice',
                        flagged: true
                    });
                }
            }

            return frauds;
        } catch (error) {
            console.error('Invoice fraud detection error:', error);
            return [];
        }
    }

    /**
     * Check if number is suspiciously round (possible fake)
     */
    isSuspiciouslyRound(amount) {
        const lastDigits = amount % 1000;
        // Check if last 3 digits are all zeros
        return lastDigits === 0 && amount > 10000;
    }

    /**
     * Detect cost inflation patterns
     */
    async detectCostInflation() {
        try {
            const result = await pool.query(`
                SELECT performed_by,
                       AVG(cost) as avg_cost,
                       MAX(cost) as max_cost,
                       MIN(cost) as min_cost,
                       COUNT(*) as job_count,
                       VARIANCE(cost) as cost_variance
                FROM maintenance_schedule
                WHERE maintenance_date > CURRENT_DATE - INTERVAL '1 year'
                GROUP BY performed_by
                HAVING COUNT(*) > 3
            `);

            const inflations = [];

            for (const row of result.rows) {
                const coefficient = Math.sqrt(row.cost_variance) / row.avg_cost; // Coefficient of variation
                const priceSpread = (row.max_cost / row.min_cost - 1) * 100;

                // Flag if high variance in same contractor's pricing
                if (coefficient > 0.6) {
                    inflations.push({
                        type: 'Contractor Price Variance',
                        severity: coefficient > 0.8 ? 'High' : 'Medium',
                        description: `Contractor "${row.performed_by}" shows inconsistent pricing (${Math.round(priceSpread)}% variance)`,
                        details: `Avg: ${Math.round(row.avg_cost)}, Min: ${row.min_cost}, Max: ${row.max_cost}, Jobs: ${row.job_count}`,
                        riskFactor: Math.round(priceSpread),
                        recommendation: 'Review pricing methodology and approve contractor terms',
                        flagged: true
                    });
                }
            }

            return inflations;
        } catch (error) {
            console.error('Cost inflation detection error:', error);
            return [];
        }
    }

    /**
     * Detect approval anomalies
     */
    async detectApprovalAnomalies() {
        try {
            const result = await pool.query(`
                SELECT approved_by, COUNT(*) as approval_count,
                       AVG(approved_cost) as avg_approval_amount,
                       COUNT(CASE WHEN approval_status = 'Approved' THEN 1 END) as approved_count
                FROM complaints
                WHERE approved_by IS NOT NULL
                AND created_at > CURRENT_DATE - INTERVAL '1 year'
                GROUP BY approved_by
                HAVING COUNT(*) > 5
            `);

            if (result.rows.length === 0) return [];

            const anomalies = [];
            const allApprovals = result.rows.map(r => r.approved_count / r.approval_count);
            
            if (allApprovals.length === 0) return [];
            
            const avgApprovalRate = stats.mean(allApprovals);
            const stdDev = allApprovals.length > 1 ? stats.standardDeviation(allApprovals) : 0;

            for (const row of result.rows) {
                const approvalRate = row.approved_count / row.approval_count;

                if (stdDev > 0 && approvalRate > avgApprovalRate + (2 * stdDev)) {
                    anomalies.push({
                        type: 'Unusually High Approval Rate',
                        severity: approvalRate > 0.95 ? 'Critical' : 'High',
                        description: `Officer ID ${row.approved_by} has ${Math.round(approvalRate * 100)}% approval rate`,
                        details: `Approved: ${row.approved_count}/${row.approval_count}, Avg Amount: ${Math.round(row.avg_approval_amount)}`,
                        riskFactor: Math.round((approvalRate - avgApprovalRate) * 100),
                        recommendation: 'Audit approvals and review officer discretion',
                        flagged: true
                    });
                }

                if (stdDev > 0 && approvalRate < avgApprovalRate - (2 * stdDev)) {
                    anomalies.push({
                        type: 'Unusually Low Approval Rate',
                        severity: 'Medium',
                        description: `Officer ID ${row.approved_by} has only ${Math.round(approvalRate * 100)}% approval rate`,
                        details: `Rejected: ${row.approval_count - row.approved_count}/${row.approval_count}`,
                        riskFactor: Math.round((avgApprovalRate - approvalRate) * 100),
                        recommendation: 'Review rejection criteria for consistency',
                        flagged: true
                    });
                }
            }

            return anomalies;
        } catch (error) {
            console.error('Approval anomaly detection error:', error);
            return [];
        }
    }

    /**
     * Get fraud summary for compliance report
     */
    async getFraudSummary() {
        try {
            const fraudReport = await this.detectFraudPatterns();

            const summary = {
                reportDate: new Date(),
                totalAlerts: fraudReport.totalAlerts,
                critical: fraudReport.criticalAlerts,
                high: fraudReport.highAlerts,
                medium: fraudReport.mediumAlerts,
                estimatedFraudRisk: this.calculateFraudRisk(fraudReport),
                recommendedActions: this.getRecommendedActions(fraudReport),
                alerts: fraudReport.alerts
            };

            return summary;
        } catch (error) {
            throw new Error(`Fraud summary error: ${error.message}`);
        }
    }

    /**
     * Calculate overall fraud risk percentage
     */
    calculateFraudRisk(fraudReport) {
        const totalAlerts = fraudReport.totalAlerts;
        const criticality = (fraudReport.criticalAlerts * 0.5) + (fraudReport.highAlerts * 0.3) + (fraudReport.mediumAlerts * 0.1);
        
        return Math.min(100, Math.round((criticality / Math.max(1, totalAlerts)) * 100));
    }

    /**
     * Generate recommended actions for fraud mitigation
     */
    getRecommendedActions(fraudReport) {
        const actions = [];

        if (fraudReport.criticalAlerts > 0) {
            actions.push({
                priority: 'Critical',
                action: 'Immediate Investigation',
                items: [
                    'Freeze suspicious vendor accounts',
                    'Review all transactions from flagged contractors',
                    'Audit approvals by flagged officers'
                ]
            });
        }

        if (fraudReport.highAlerts > 0) {
            actions.push({
                priority: 'High',
                action: 'Detailed Audit',
                items: [
                    'Request detailed invoices for flagged transactions',
                    'Verify work completion through site inspections',
                    'Cross-check with contractor performance records'
                ]
            });
        }

        actions.push({
            priority: 'Ongoing',
            action: 'Prevention Measures',
            items: [
                'Implement stricter approval limits',
                'Require multiple approvals for large amounts',
                'Review contractor verification procedures'
            ]
        });

        return actions;
    }
}

module.exports = new FraudDetectionService();
