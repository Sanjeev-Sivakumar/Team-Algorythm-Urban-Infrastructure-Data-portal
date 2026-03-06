const pool = require('../config/db');

const assessClimateRisk = async (latitude, longitude) => {
    const result = await pool.query(
        `SELECT * FROM climate_risk_data 
         ORDER BY ABS(latitude - $1) + ABS(longitude - $2) LIMIT 1`,
        [latitude, longitude]
    );
    
    return result.rows[0] || {
        flood_risk_score: 0.5,
        heat_vulnerability_score: 0.5,
        environmental_impact_score: 0.5,
        resilience_score: 0.5
    };
};

const saveClimateAssessment = async (assetId, riskData) => {
    const result = await pool.query(
        `INSERT INTO climate_assessments (asset_id, flood_risk, heat_vulnerability, environmental_impact, resilience_score)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [assetId, riskData.flood_risk_score, riskData.heat_vulnerability_score, 
         riskData.environmental_impact_score, riskData.resilience_score]
    );
    
    return result.rows[0];
};

const getClimateReport = async (assetId) => {
    const result = await pool.query(
        `SELECT * FROM climate_assessments WHERE asset_id = $1 ORDER BY assessment_date DESC LIMIT 1`,
        [assetId]
    );
    
    return result.rows[0];
};

module.exports = { assessClimateRisk, saveClimateAssessment, getClimateReport };
