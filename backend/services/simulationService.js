const pool = require('../config/db');

const simulateBudgetChange = async (budgetChange, userId) => {
    const assets = await pool.query('SELECT type, COUNT(*) as count FROM assets GROUP BY type');
    
    const impact = assets.rows.map(row => ({
        assetType: row.type,
        currentMaintenance: row.count * 50000,
        projectedMaintenance: row.count * 50000 * (1 + budgetChange / 100),
        impactLevel: budgetChange > 0 ? 'Positive' : 'Negative'
    }));
    
    const result = await pool.query(
        `INSERT INTO simulations (simulation_type, parameters, results, created_by)
         VALUES ('Budget Change', $1, $2, $3) RETURNING *`,
        [JSON.stringify({ budgetChange }), JSON.stringify(impact), userId]
    );
    
    return { simulation: result.rows[0], impact };
};

const simulateMaintenanceStrategy = async (strategy, userId) => {
    const strategies = {
        'Preventive': { costMultiplier: 1.2, failureReduction: 0.4, resilienceGain: 0.3 },
        'Reactive': { costMultiplier: 0.8, failureReduction: 0.1, resilienceGain: 0.1 },
        'Predictive': { costMultiplier: 1.5, failureReduction: 0.6, resilienceGain: 0.5 }
    };
    
    const params = strategies[strategy] || strategies['Reactive'];
    
    const result = await pool.query(
        `INSERT INTO simulations (simulation_type, parameters, results, created_by)
         VALUES ('Maintenance Strategy', $1, $2, $3) RETURNING *`,
        [JSON.stringify({ strategy }), JSON.stringify(params), userId]
    );
    
    return { simulation: result.rows[0], impact: params };
};

const simulateCascadingFailure = async (primaryAssetType) => {
    const result = await pool.query(
        `SELECT * FROM failure_patterns WHERE primary_asset_type = $1`,
        [primaryAssetType]
    );
    
    return result.rows.map(row => ({
        affectedAsset: row.secondary_asset_type,
        probability: row.cascade_probability,
        timeToImpact: row.avg_cascade_time + ' hours',
        severity: row.impact_severity
    }));
};

module.exports = { simulateBudgetChange, simulateMaintenanceStrategy, simulateCascadingFailure };
