const pool = require('../config/db');

// Simple statistical ML without external dependencies
const predictAssetFailure = async (assetType, age, maintenanceCount) => {
    const result = await pool.query(
        `SELECT AVG(age_at_failure) as avg_age, AVG(maintenance_count) as avg_maintenance, 
         AVG(total_cost) as avg_cost, COUNT(*) as failure_count 
         FROM historical_asset_data WHERE asset_type = $1`,
        [assetType]
    );
    
    const data = result.rows[0];
    if (!data || !data.avg_age) {
        return {
            failureProbability: '0.5000',
            predictedFailureDate: new Date(Date.now() + 365 * 86400000),
            confidenceScore: '0.6000',
            recommendedAction: 'Insufficient data - Monitor regularly'
        };
    }
    
    // Calculate failure probability using weighted factors
    const ageFactor = Math.min(age / parseFloat(data.avg_age), 1);
    const maintenanceFactor = maintenanceCount > 0 ? Math.min(maintenanceCount / parseFloat(data.avg_maintenance), 1) : 0.5;
    const failureProbability = Math.min(ageFactor * 0.6 + maintenanceFactor * 0.4, 0.99);
    
    // Predict days to failure
    const remainingLife = Math.max(parseFloat(data.avg_age) - age, 0);
    const daysToFailure = Math.max(Math.floor(remainingLife * 365 * (1 - failureProbability)), 30);
    
    // Confidence based on sample size
    const confidenceScore = Math.min(0.6 + (parseInt(data.failure_count) / 20) * 0.3, 0.95);
    
    return {
        failureProbability: failureProbability.toFixed(4),
        predictedFailureDate: new Date(Date.now() + daysToFailure * 86400000),
        confidenceScore: confidenceScore.toFixed(4),
        recommendedAction: failureProbability > 0.7 ? 'Immediate Maintenance Required' : 
                          failureProbability > 0.5 ? 'Schedule Maintenance Soon' : 'Monitor Regularly',
        estimatedCost: Math.round(parseFloat(data.avg_cost) * (1 + failureProbability * 0.5))
    };
};

const forecastMaintenance = async (department) => {
    const result = await pool.query(
        `SELECT asset_type, AVG(total_cost) as avg_cost, COUNT(*) as count,
         AVG(age_at_failure) as avg_age
         FROM historical_asset_data GROUP BY asset_type ORDER BY avg_cost DESC`
    );
    
    return result.rows.map(row => ({
        assetType: row.asset_type,
        predictedCost: Math.round(parseFloat(row.avg_cost) * 1.15),
        frequency: Math.max(Math.ceil(parseInt(row.count) / 12), 1),
        priority: parseFloat(row.avg_cost) > 100000 ? 'High' : 
                 parseFloat(row.avg_cost) > 50000 ? 'Medium' : 'Low',
        avgLifespan: Math.round(parseFloat(row.avg_age)) + ' years'
    }));
};

const optimizeBudget = async (totalBudget) => {
    const result = await pool.query(
        `SELECT department, asset_type, AVG(allocated_amount) as avg_allocated, 
         AVG(spent_amount) as avg_spent, COUNT(*) as project_count
         FROM budget_history GROUP BY department, asset_type ORDER BY avg_allocated DESC`
    );
    
    const totalHistorical = result.rows.reduce((sum, r) => sum + parseFloat(r.avg_allocated), 0);
    
    return result.rows.map(row => {
        const efficiency = (parseFloat(row.avg_spent) / parseFloat(row.avg_allocated) * 100);
        const weight = parseFloat(row.avg_allocated) / totalHistorical;
        const recommendedAmount = Math.round(totalBudget * weight);
        
        return {
            department: row.department,
            assetType: row.asset_type,
            recommendedAmount: recommendedAmount,
            efficiency: efficiency.toFixed(1) + '%',
            projectCount: parseInt(row.project_count),
            priority: efficiency > 95 ? 'High Efficiency' : efficiency > 90 ? 'Good' : 'Needs Review'
        };
    });
};

module.exports = { predictAssetFailure, forecastMaintenance, optimizeBudget };
