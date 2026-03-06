/**
 * Infrastructure Equity Analysis Engine (Module 16)
 * Checks fairness: infrastructure investment per district, budget distribution, risk imbalance
 * Generates equity imbalance reports
 */

const pool = require('../config/db');
const stats = require('simple-statistics');

class InfrastructureEquityService {
    /**
     * Analyze infrastructure equity across districts
     */
    async analyzeEquity() {
        try {
            const districtAnalysis = await this.analyzeDistrictEquity();
            const budgetEquity = await this.analyzeBudgetEquity();
            const riskEquity = await this.analyzeRiskEquity();
            const accessEquity = await this.analyzeAccessEquity();

            const equityReport = {
                reportDate: new Date(),
                districtEquity: districtAnalysis,
                budgetEquity: budgetEquity,
                riskEquity: riskEquity,
                accessEquity: accessEquity,
                overallEquityScore: this.calculateOverallEquityScore(
                    districtAnalysis,
                    budgetEquity,
                    riskEquity,
                    accessEquity
                ),
                recommendations: this.generateEquityRecommendations(
                    districtAnalysis,
                    budgetEquity,
                   riskEquity
                )
            };

            return equityReport;
        } catch (error) {
            throw new Error(`Equity analysis error: ${error.message}`);
        }
    }

    /**
     * Analyze infrastructure investment distribution across districts
     */
    async analyzeDistrictEquity() {
        try {
            const result = await pool.query(`
                SELECT 
                    COALESCE(district, 'Unknown') as district,
                    COUNT(*) as asset_count,
                    ROUND(AVG(EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM installation_date))) as avg_age,
                    SUM(CASE WHEN status = 'Good' THEN 1 ELSE 0 END) as good_count
                FROM assets
                GROUP BY district
            `);

            const districtData = result.rows;

            // Calculate investment per district
            const investmentResult = await pool.query(`
                SELECT district, SUM(allocated_amount) as total_investment,
                       SUM(spent_amount) as spent,
                       COUNT(DISTINCT asset_type) as asset_types
                FROM budget_history
                GROUP BY district
            `);

            const investmentData = investmentResult.rows;

            // Combine data
            const districts = {};
            for (const d of districtData) {
                if (!districts[d.district]) {
                    districts[d.district] = {
                        name: d.district,
                        assetCount: d.asset_count,
                        avgAge: d.avg_age
                    };
                }
            }

            for (const inv of investmentData) {
                if (districts[inv.district]) {
                    districts[inv.district].investmentPerAsset = Math.round(parseFloat(inv.total_investment) / districts[inv.district].assetCount);
                    districts[inv.district].totalInvestment = parseFloat(inv.total_investment);
                }
            }

            const districtArray = Object.values(districts);

            // Calculate equity metrics
            const investments = districtArray.map(d => d.investmentPerAsset || 0).filter(i => i > 0);
            const meanInvestment = stats.mean(investments);
            const stdDev = stats.standardDeviation(investments);
            const coefficientOfVariation = stdDev / meanInvestment;

            // Equity score (0-100, where 100 = perfect equity)
            const equityScore = Math.max(0, 100 - (coefficientOfVariation * 50));

            return {
                districts: districtArray,
                statistics: {
                    meanInvestmentPerAsset: Math.round(meanInvestment),
                    minInvestment: Math.round(Math.min(...investments)),
                    maxInvestment: Math.round(Math.max(...investments)),
                    standardDeviation: Math.round(stdDev),
                    coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100
                },
                equityScore: Math.round(equityScore),
                equityLevel: equityScore > 75 ? 'High Equity' : equityScore > 50 ? 'Moderate Equity' : 'Low Equity',
                underservedDistricts: this.identifyUnderservedDistricts(districtArray, meanInvestment)
            };
        } catch (error) {
            console.error('District equity analysis error:', error);
            return { districts: [], equityScore: 50 };
        }
    }

    /**
     * Analyze budget distribution equity
     */
    async analyzeBudgetEquity() {
        try {
            const result = await pool.query(`
                SELECT department,
                       SUM(allocated_amount) as total_allocated,
                       SUM(spent_amount) as total_spent,
                       COUNT(*) as transactions,
                       AVG(allocated_amount) as avg_allocation
                FROM budget_history
                GROUP BY department
            `);

            const departments = result.rows;

            // Calculate equity metrics
            const allocations = departments.map(d => parseFloat(d.total_allocated));
            const meanAllocation = stats.mean(allocations);
            const stdDev = stats.standardDeviation(allocations);

            // Calculate budget utilization equity
            const utilizationRates = departments.map(d =>
                (parseFloat(d.total_spent) / parseFloat(d.total_allocated)) * 100
            );
            const meanUtilization = stats.mean(utilizationRates);
            const utilizationStdDev = stats.standardDeviation(utilizationRates);

            // Equity score
            const allocationEquity = Math.max(0, 100 - ((stdDev / meanAllocation) * 50));
            const utilizationEquity = Math.max(0, 100 - ((utilizationStdDev / Math.max(meanUtilization, 1)) * 50));

            return {
                departmentBreakdown: departments.map(d => ({
                    name: d.department,
                    allocated: parseFloat(d.total_allocated),
                    spent: parseFloat(d.total_spent),
                    utilizationRate: Math.round((parseFloat(d.total_spent) / parseFloat(d.total_allocated)) * 100),
                    transactions: d.transactions
                })),
                statistics: {
                    meanAllocationPerDept: Math.round(meanAllocation),
                    totalBudgetAllocated: Math.round(allocations.reduce((a, b) => a + b, 0)),
                    totalBudgetSpent: Math.round(
                        departments.reduce((sum, d) => sum + parseFloat(d.total_spent), 0)
                    ),
                    meanUtilizationRate: Math.round(meanUtilization)
                },
                allocationEquityScore: Math.round(allocationEquity),
                utilizationEquityScore: Math.round(utilizationEquity),
                overallBudgetEquity: Math.round((allocationEquity + utilizationEquity) / 2),
                inequitableDepartments: this.identifyInequitableDepartments(departments, meanAllocation)
            };
        } catch (error) {
            console.error('Budget equity analysis error:', error);
            return { departmentBreakdown: [], overallBudgetEquity: 50 };
        }
    }

    /**
     * Analyze risk distribution equity (unequal risk distribution)
     */
    async analyzeRiskEquity() {
        try {
            const result = await pool.query(`
                SELECT COALESCE(district, 'Unknown') as district,
                       COUNT(*) as asset_count,
                       SUM(CASE WHEN status = 'Critical' THEN 1 ELSE 0 END) as critical_count,
                       SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) as maintenance_count,
                       SUM(CASE WHEN status = 'Good' THEN 1 ELSE 0 END) as good_count
                FROM assets
                GROUP BY district
            `);

            const districtRisks = {};
            for (const row of result.rows) {
                districtRisks[row.district] = {
                    totalAssets: row.asset_count,
                    criticalAssets: row.critical_count,
                    maintenanceAssets: row.maintenance_count,
                    goodAssets: row.good_count,
                    criticalPercentage: Math.round((row.critical_count / row.asset_count) * 100)
                };
            }

            // Calculate risk equity
            const criticalPercentages = Object.values(districtRisks).map(d => d.criticalPercentage);
            const meanCriticalPercentage = stats.mean(criticalPercentages);
            const stdDev = stats.standardDeviation(criticalPercentages);

            // Equity score (lower std dev = better equity)
            const riskEquityScore = Math.max(0, 100 - ((stdDev / Math.max(meanCriticalPercentage, 1)) * 100));

            return {
                districtRiskBreakdown: Object.entries(districtRisks).map(([name, data]) => ({
                    district: name,
                    ...data
                })),
                statistics: {
                    meanCriticalPercentage: Math.round(meanCriticalPercentage),
                    highestCriticalPercentage: Math.max(...criticalPercentages),
                    lowestCriticalPercentage: Math.min(...criticalPercentages),
                    riskVariation: Math.round(stdDev)
                },
                riskEquityScore: Math.round(riskEquityScore),
                equityLevel: riskEquityScore > 70 ? 'Equitable' : riskEquityScore > 50 ? 'Moderately Equitable' : 'Inequitable',
                highRiskDistricts: this.identifyHighRiskDistricts(districtRisks)
            };
        } catch (error) {
            console.error('Risk equity analysis error:', error);
            return { districtRiskBreakdown: [], riskEquityScore: 50 };
        }
    }

    /**
     * Analyze infrastructure access equity
     */
    async analyzeAccessEquity() {
        try {
            const result = await pool.query(`
                SELECT type,
                       COUNT(*) as count,
                       COUNT(DISTINCT 
                           CASE WHEN geometry IS NOT NULL THEN 1 END
                       ) as spatially_mapped
                FROM assets
                GROUP BY type
            `);

            const assetTypes = result.rows;

            const coverageRates = assetTypes.map(a => ({
                type: a.type,
                totalAssets: a.count,
                spatialCoverage: a.spatially_mapped || 0,
                coveragePercentage: Math.round(((a.spatially_mapped || 0) / a.count) * 100)
            }));

            // Public facility access
            const accessResult = await pool.query(`
                SELECT 
                    COUNT(*) as total_facilities,
                    COUNT(DISTINCT type) as facility_types
                FROM assets
                WHERE type IN ('Public Facility', 'Park', 'Building')
            `);

            const accessData = accessResult.rows[0];

            return {
                assetTypeCoverage: coverageRates,
                publicFacilityAccess: {
                    totalPublicFacilities: accessData.total_facilities,
                    facilityTypes: accessData.facility_types,
                    accessScore: 75 // Simplified - in real system, calculate based on population distribution
                },
                geographicCoverage: {
                    spatiallyMappedAssets: assetTypes.reduce((sum, a) => sum + (a.spatially_mapped || 0), 0),
                    totalAssets: assetTypes.reduce((sum, a) => sum + a.count, 0),
                    coveragePercentage: Math.round(
                        (assetTypes.reduce((sum, a) => sum + (a.spatially_mapped || 0), 0) / 
                        assetTypes.reduce((sum, a) => sum + a.count, 0)) * 100
                    )
                }
            };
        } catch (error) {
            console.error('Access equity analysis error:', error);
            return { assetTypeCoverage: [], publicFacilityAccess: {} };
        }
    }

    /**
     * Calculate overall equity score
     */
    calculateOverallEquityScore(district, budget, risk, access) {
        const scores = [
            district.equityScore || 50,
            budget.overallBudgetEquity || 50,
            risk.riskEquityScore || 50,
            access.publicFacilityAccess?.accessScore || 50
        ];

        return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    }

    /**
     * Identify underserved districts
     */
    identifyUnderservedDistricts(districts, meanInvestment) {
        return districts
            .filter(d => (d.investmentPerAsset || 0) < meanInvestment * 0.7)
            .map(d => ({
                district: d.name,
                investmentPerAsset: d.investmentPerAsset,
                gap: Math.round(meanInvestment * 0.7 - (d.investmentPerAsset || 0)),
                recommendation: `Increase investment by ${Math.round(((meanInvestment * 0.7 - (d.investmentPerAsset || 0)) / meanInvestment) * 100)}% to reach equity`
            }));
    }

    /**
     * Identify inequitable departments
     */
    identifyInequitableDepartments(departments, meanAllocation) {
        return departments
            .filter(d => parseFloat(d.total_allocated) < meanAllocation * 0.7)
            .map(d => ({
                department: d.department,
                allocated: Math.round(parseFloat(d.total_allocated)),
                utilized: Math.round(parseFloat(d.total_spent)),
                gap: Math.round(meanAllocation * 0.7 - parseFloat(d.total_allocated))
            }));
    }

    /**
     * Identify districts with high risk concentration
     */
    identifyHighRiskDistricts(districtRisks) {
        const criticalPercentages = Object.values(districtRisks).map(d => d.criticalPercentage);
        const mean = stats.mean(criticalPercentages);

        return Object.entries(districtRisks)
            .filter(([_, data]) => data.criticalPercentage > mean * 1.3)
            .map(([name, data]) => ({
                district: name,
                criticalAssets: data.criticalAssets,
                criticalPercentage: data.criticalPercentage,
                overMean: Math.round((data.criticalPercentage / mean - 1) * 100),
                recommendation: 'Prioritize budget allocation to this district'
            }));
    }

    /**
     * Generate equity recommendations
     */
    generateEquityRecommendations(districtEqu, budgetEqu, riskEqu) {
        const recommendations = [];

        // District recommendations
        if (districtEqu.equityScore < 60) {
            recommendations.push({
                category: 'District Investment Equity',
                priority: 'High',
                actions: [
                    'Redistribute budget toward underserved districts',
                    `Focus on: ${districtEqu.underservedDistricts.map(d => d.district).join(', ')}`,
                    'Target 20% increase in underserved areas'
                ]
            });
        }

        // Budget recommendations
        if (budgetEqu.overallBudgetEquity < 60) {
            recommendations.push({
                category: 'Department Budget Equity',
                priority: 'High',
                actions: [
                    'Rebalance budget allocation across departments',
                    'Ensure at least 70% of mean allocation for all departments',
                    'Review spending patterns and adjust priorities'
                ]
            });
        }

        // Risk recommendations
        if (riskEqu.riskEquityScore < 60) {
            recommendations.push({
                category: 'Risk Distribution Equity',
                priority: 'Critical',
                actions: [
                    'Urgent: Address high-risk district concentration',
                    `Priority districts: ${riskEqu.highRiskDistricts.map(d => d.district).join(', ')}`,
                    'Allocate emergency maintenance budget to these areas'
                ]
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                category: 'Overall',
                priority: 'Low',
                actions: [
                    'Continue monitoring equity metrics',
                    'Maintain current distribution strategy',
                    'Review quarterly for changes'
                ]
            });
        }

        return recommendations;
    }

    /**
     * Generate equity scorecard
     */
    async generateEquityScorecard() {
        try {
            const analysis = await this.analyzeEquity();

            return {
                reportDate: analysis.reportDate,
                scorecards: [
                    {
                        metric: 'District Investment Equity',
                        score: analysis.districtEquity.equityScore,
                        rating: analysis.districtEquity.equityLevel,
                        status: analysis.districtEquity.equityScore > 70 ? 'Good' : 'Needs Attention'
                    },
                    {
                        metric: 'Budget Distribution Equity',
                        score: analysis.budgetEquity.overallBudgetEquity,
                        rating: analysis.budgetEquity.overallBudgetEquity > 70 ? 'Equitable' : 'Inequitable',
                        status: analysis.budgetEquity.overallBudgetEquity > 70 ? 'Good' : 'Needs Attention'
                    },
                    {
                        metric: 'Risk Distribution Equity',
                        score: analysis.riskEquity.riskEquityScore,
                        rating: analysis.riskEquity.equityLevel,
                        status: analysis.riskEquity.riskEquityScore > 70 ? 'Good' : 'Needs Attention'
                    }
                ],
                overallEquityScore: analysis.overallEquityScore,
                overallStatus: analysis.overallEquityScore > 70 ? 'High Equity' : analysis.overallEquityScore > 50 ? 'Moderate Equity' : 'Low Equity'
            };
        } catch (error) {
            throw new Error(`Equity scorecard error: ${error.message}`);
        }
    }
}

module.exports = new InfrastructureEquityService();
