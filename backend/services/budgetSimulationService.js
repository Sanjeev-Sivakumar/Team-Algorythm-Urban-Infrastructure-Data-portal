/**
 * Policy & Budget Simulation Engine (Module 8)
 * Users can simulate budget scenarios and see before/after impacts
 * Scenarios: increase budget, reduce budget, change maintenance frequency, contractor allocation
 */

const pool = require('../config/db');
const healthScoring = require('./healthScoringService');
const riskPrediction = require('./riskPredictionService');
const criticalityIndex = require('./criticalityIndexService');

class BudgetSimulationService {
    /**
     * Run budget simulation scenario
     */
    async runSimulation(scenario) {
        try {
            // Get current state
            const currentState = await this.getCurrentInfrastructureState();

            // Apply scenario changes
            const simulatedState = await this.applyScenario(currentState, scenario);

            // Calculate impacts
            const impact = await this.calculateSimulationImpact(currentState, simulatedState, scenario);

            return {
                scenario,
                currentState,
                simulatedState,
                impact,
                recommendation: this.generateScenarioRecommendation(impact, scenario)
            };
        } catch (error) {
            throw new Error(`Budget simulation error: ${error.message}`);
        }
    }

    /**
     * Get current infrastructure state
     */
    async getCurrentInfrastructureState() {
        try {
            const assets = await pool.query('SELECT id FROM assets');
            const assetIds = assets.rows.map(r => r.id);

            let totalAssets = assetIds.length;
            let goodAssets = 0;
            let moderateAssets = 0;
            let criticalAssets = 0;
            let totalHealth = 0;
            let averageFailureRisk = 0;

            for (const id of assetIds) {
                const health = await healthScoring.calculateAssetHealthScore(id);
                totalHealth += health.healthScore;

                if (health.healthScore >= 76) goodAssets++;
                else if (health.healthScore >= 51) moderateAssets++;
                else criticalAssets++;

                const predictions = await riskPrediction.generateRiskPredictions(id);
                averageFailureRisk += predictions.predictions.month_3.probability;
            }

            const budget = await pool.query(`
                SELECT SUM(allocated_amount) as total_allocated, 
                       SUM(spent_amount) as total_spent
                FROM budget_history
                WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
            `);

            const budgetData = budget.rows[0];

            return {
                totalAssets,
                assetCondition: {
                    good: goodAssets,
                    moderate: moderateAssets,
                    critical: criticalAssets
                },
                averageHealthScore: Math.round(totalHealth / totalAssets),
                averageFailureRisk: Math.round((averageFailureRisk / totalAssets) * 100),
                budget: {
                    allocated: parseFloat(budgetData.total_allocated) || 0,
                    spent: parseFloat(budgetData.total_spent) || 0,
                    remaining: (parseFloat(budgetData.total_allocated) || 0) - (parseFloat(budgetData.total_spent) || 0)
                }
            };
        } catch (error) {
            console.error('Current state calculation error:', error);
            throw error;
        }
    }

    /**
     * Apply scenario to infrastructure state
     */
    async applyScenario(currentState, scenario) {
        let simulatedState = JSON.parse(JSON.stringify(currentState)); // Deep copy

        if (scenario.type === 'INCREASE_BUDGET') {
            const increase = scenario.percentage || 20;
            simulatedState.budget.allocated *= (1 + increase / 100);
            simulatedState.budget.remaining = simulatedState.budget.allocated - simulatedState.budget.spent;

            // More budget improves health
            simulatedState.assetCondition.critical = Math.ceil(simulatedState.assetCondition.critical * 0.85);
            simulatedState.assetCondition.moderate += Math.ceil(simulatedState.assetCondition.critical * 0.15);
            simulatedState.averageHealthScore = Math.round(simulatedState.averageHealthScore * 1.15);
            simulatedState.averageFailureRisk = Math.round(simulatedState.averageFailureRisk * 0.85);
        }

        else if (scenario.type === 'DECREASE_BUDGET') {
            const decrease = scenario.percentage || 20;
            simulatedState.budget.allocated *= (1 - decrease / 100);
            simulatedState.budget.remaining = simulatedState.budget.allocated - simulatedState.budget.spent;

            // Less budget worsens health
            simulatedState.assetCondition.moderate = Math.ceil(simulatedState.assetCondition.moderate * 1.2);
            simulatedState.assetCondition.critical += Math.ceil(simulatedState.assetCondition.moderate * 0.2);
            simulatedState.averageHealthScore = Math.round(simulatedState.averageHealthScore * 0.88);
            simulatedState.averageFailureRisk = Math.round(simulatedState.averageFailureRisk * 1.25);
        }

        else if (scenario.type === 'INCREASE_MAINTENANCE_FREQUENCY') {
            // More frequent maintenance improves health
            simulatedState.assetCondition.good += Math.ceil(simulatedState.assetCondition.moderate * 0.3);
            simulatedState.assetCondition.moderate -= Math.ceil(simulatedState.assetCondition.moderate * 0.3);
            simulatedState.averageHealthScore = Math.round(simulatedState.averageHealthScore * 1.25);
            simulatedState.averageFailureRisk = Math.round(simulatedState.averageFailureRisk * 0.7);
            simulatedState.budget.allocated *= 1.15; // More maintenance = more cost
        }

        else if (scenario.type === 'TARGET_CRITICAL_ASSETS') {
            // Focus budget on critical assets
            const criticalHealed = Math.ceil(simulatedState.assetCondition.critical * 0.5);
            simulatedState.assetCondition.critical -= criticalHealed;
            simulatedState.assetCondition.moderate += criticalHealed;
            simulatedState.averageHealthScore = Math.round(simulatedState.averageHealthScore * 1.12);
            simulatedState.averageFailureRisk = Math.round(simulatedState.averageFailureRisk * 0.8);
        }

        else if (scenario.type === 'IMPROVE_CONTRACTOR_PERFORMANCE') {
            // Better contractors = better outcomes with same budget
            simulatedState.assetCondition.good += Math.ceil(simulatedState.assetCondition.moderate * 0.2);
            simulatedState.assetCondition.moderate -= Math.ceil(simulatedState.assetCondition.moderate * 0.2);
            simulatedState.averageHealthScore = Math.round(simulatedState.averageHealthScore * 1.1);
            simulatedState.averageFailureRisk = Math.round(simulatedState.averageFailureRisk * 0.85);
        }

        // Recalculate health score
        const newGood = simulatedState.assetCondition.good;
        const newModerate = simulatedState.assetCondition.moderate;
        const newCritical = simulatedState.assetCondition.critical;
        const total = newGood + newModerate + newCritical;

        simulatedState.assetCondition.goodPercentage = Math.round((newGood / total) * 100);
        simulatedState.assetCondition.moderatePercentage = Math.round((newModerate / total) * 100);
        simulatedState.assetCondition.criticalPercentage = Math.round((newCritical / total) * 100);

        return simulatedState;
    }

    /**
     * Calculate impact of simulation
     */
    async calculateSimulationImpact(currentState, simulatedState, scenario) {
        return {
            budgetImpact: {
                current: currentState.budget.allocated,
                simulated: simulatedState.budget.allocated,
                change: simulatedState.budget.allocated - currentState.budget.allocated,
                percentChange: Math.round(
                    ((simulatedState.budget.allocated - currentState.budget.allocated) / currentState.budget.allocated) * 100
                )
            },
            healthImpact: {
                currentScore: currentState.averageHealthScore,
                simulatedScore: simulatedState.averageHealthScore,
                improvement: simulatedState.averageHealthScore - currentState.averageHealthScore
            },
            riskImpact: {
                currentRisk: currentState.averageFailureRisk,
                simulatedRisk: simulatedState.averageFailureRisk,
                reduction: currentState.averageFailureRisk - simulatedState.averageFailureRisk
            },
            assetConditionImpact: {
                critical: {
                    current: currentState.assetCondition.critical,
                    simulated: simulatedState.assetCondition.critical,
                    change: simulatedState.assetCondition.critical - currentState.assetCondition.critical
                },
                moderate: {
                    current: currentState.assetCondition.moderate,
                    simulated: simulatedState.assetCondition.moderate,
                    change: simulatedState.assetCondition.moderate - currentState.assetCondition.moderate
                },
                good: {
                    current: currentState.assetCondition.good,
                    simulated: simulatedState.assetCondition.good,
                    change: simulatedState.assetCondition.good - currentState.assetCondition.good
                }
            },
            costEffectiveness: this.calculateCostEffectiveness(
                simulatedState.budget.allocated - currentState.budget.allocated,
                simulatedState.averageHealthScore - currentState.averageHealthScore
            ),
            projectedLongTermSavings: this.calculateLongTermSavings(scenario, simulatedState)
        };
    }

    /**
     * Calculate cost effectiveness ratio
     */
    calculateCostEffectiveness(budgetChange, healthImprovement) {
        if (budgetChange === 0) return 0;

        // Cost per health point
        const costPerPoint = budgetChange / Math.max(1, healthImprovement);

        // Efficiency rating
        let rating = 'Poor';
        if (costPerPoint < 50000) rating = 'Excellent';
        else if (costPerPoint < 100000) rating = 'Good';
        else if (costPerPoint < 200000) rating = 'Fair';

        return {
            costPerHealthPoint: Math.round(costPerPoint),
            efficiency: rating,
            roi: Math.round((healthImprovement / Math.abs(budgetChange)) * 100) + '%'
        };
    }

    /**
     * Calculate projected long-term savings
     */
    calculateLongTermSavings(scenario, simulatedState) {
        let savings = 0;

        if (scenario.type === 'INCREASE_MAINTENANCE_FREQUENCY') {
            // Preventive maintenance reduces emergency repairs by ~40%
            const emergencyRepairCostReduction = 0.40;
            const estimatedAnnualEmergencyRepairs = 5000000; // Estimate
            savings = estimatedAnnualEmergencyRepairs * emergencyRepairCostReduction * 3; // 3-year projection
        }

        else if (scenario.type === 'TARGET_CRITICAL_ASSETS') {
            // Fixing critical assets prevents catastrophic failures
            const preventedFailures = simulatedState.assetCondition.critical <= 5 ? 2 : 1;
            const costPerCatastrophicFailure = 10000000; // Estimate
            savings = preventedFailures * costPerCatastrophicFailure;
        }

        else if (scenario.type === 'IMPROVE_CONTRACTOR_PERFORMANCE') {
            // Better contractors reduce rework and delays
            const reworkReduction = 0.25;
            const estimatedAnnualCosts = simulatedState.budget.allocated;
            savings = estimatedAnnualCosts * reworkReduction;
        }

        return {
            projectedSavings: Math.round(savings),
            timeframe: '3 years',
            description: this.getSavingsDescription(scenario.type, savings)
        };
    }

    /**
     * Get savings description
     */
    getSavingsDescription(scenarioType, savings) {
        const descriptions = {
            'INCREASE_MAINTENANCE_FREQUENCY': 'Preventive maintenance reduces emergency repairs',
            'TARGET_CRITICAL_ASSETS': 'Prevents catastrophic infrastructure failures',
            'IMPROVE_CONTRACTOR_PERFORMANCE': 'Reduces rework and project delays',
            'INCREASE_BUDGET': 'Faster asset repairs reduce service disruptions',
            'DECREASE_BUDGET': 'Cost reduction but increased risk of failures'
        };

        return descriptions[scenarioType] || 'Infrastructure improvements';
    }

    /**
     * Generate scenario recommendation
     */
    generateScenarioRecommendation(impact, scenario) {
        const recommendations = [];

        // Check if scenario is effective
        if (impact.healthImpact.improvement > 0) {
            recommendations.push({
                level: 'positive',
                message: `This scenario improves overall infrastructure health by ${impact.healthImpact.improvement} points`,
                actionable: true
            });
        } else if (impact.healthImpact.improvement < 0) {
            recommendations.push({
                level: 'warning',
                message: `This scenario reduces infrastructure health by ${Math.abs(impact.healthImpact.improvement)} points`,
                actionable: true
            });
        }

        // Check cost effectiveness
        if (impact.costEffectiveness.efficiency === 'Excellent' || impact.costEffectiveness.efficiency === 'Good') {
            recommendations.push({
                level: 'positive',
                message: `Cost effectiveness rating: ${impact.costEffectiveness.efficiency}`,
                actionable: true
            });
        } else if (impact.costEffectiveness.efficiency === 'Poor') {
            recommendations.push({
                level: 'warning',
                message: `Cost effectiveness is ${impact.costEffectiveness.efficiency}. Consider alternative scenarios`,
                actionable: true
            });
        }

        // Check long-term savings
        if (impact.projectedLongTermSavings.projectedSavings > 1000000) {
            recommendations.push({
                level: 'positive',
                message: `Projected 3-year savings: ${Math.round(impact.projectedLongTermSavings.projectedSavings / 1000000)}M`,
                actionable: true
            });
        }

        return recommendations;
    }

    /**
     * Compare multiple scenarios
     */
    async compareScenarios(scenarios) {
        try {
            const comparisons = [];

            for (const scenario of scenarios) {
                const result = await this.runSimulation(scenario);
                comparisons.push({
                    scenario: scenario.name || scenario.type,
                    healthImprovement: result.impact.healthImpact.improvement,
                    budgetChange: result.impact.budgetImpact.change,
                    riskReduction: result.impact.riskImpact.reduction,
                    costPerHealthPoint: result.impact.costEffectiveness.costPerPoint,
                    efficiency: result.impact.costEffectiveness.efficiency,
                    projectedSavings: result.impact.projectedLongTermSavings.projectedSavings
                });
            }

            // Sort by health improvement
            comparisons.sort((a, b) => b.healthImprovement - a.healthImprovement);

            return {
                scenarios: comparisons,
                bestScenario: comparisons[0],
                analysis: this.generateComparativeAnalysis(comparisons)
            };
        } catch (error) {
            throw new Error(`Scenario comparison error: ${error.message}`);
        }
    }

    /**
     * Generate comparative analysis
     */
    generateComparativeAnalysis(comparisons) {
        const bestBudget = comparisons.reduce((min, s) => s.budgetChange < min ? s.budgetChange : min, Infinity);
        const bestHealth = comparisons.reduce((max, s) => s.healthImprovement > max ? s.healthImprovement : max, 0);
        const bestRiskReduction = comparisons.reduce((max, s) => s.riskReduction > max ? s.riskReduction : max, 0);

        return {
            bestBudgetOption: comparisons.find(s => s.budgetChange === bestBudget)?.scenario,
            bestHealthOutcome: comparisons.find(s => s.healthImprovement === bestHealth)?.scenario,
            bestRiskReduction: comparisons.find(s => s.riskReduction === bestRiskReduction)?.scenario,
            recommendation: 'Combine approaches for optimal results'
        };
    }
}

module.exports = new BudgetSimulationService();
