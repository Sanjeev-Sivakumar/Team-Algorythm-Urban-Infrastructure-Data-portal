/**
 * AI-Based Risk Prediction Engine (Module 5)
 * Predicts 3-month, 6-month, and 12-month failure probabilities using ML
 */

const pool = require('../config/db');
const stats = require('simple-statistics');

class RiskPredictionService {
    /**
     * Generate risk predictions for an asset
     */
    async generateRiskPredictions(assetId) {
        try {
            const asset = await pool.query('SELECT * FROM assets WHERE id = $1', [assetId]);
            if (asset.rows.length === 0) throw new Error('Asset not found');

            const assetData = asset.rows[0];

            // Get historical data
            const historical = await this.getHistoricalData(assetId, assetData.type);

            // Calculate probabilities
            const predictions = {
                asset_id: assetId,
                asset_type: assetData.type,
                predictions: {
                    month_3: await this.predict3Month(historical, assetData),
                    month_6: await this.predict6Month(historical, assetData),
                    month_12: await this.predict12Month(historical, assetData)
                },
                riskTrend: this.determineTrend(historical),
                factors: await this.identifyRiskFactors(assetId, historical),
                recommendations: await this.generateRiskRecommendations(assetData, historical)
            };

            // Store predictions in database
            await this.storePrediction(assetId, predictions.predictions.month_3.probability);

            return predictions;
        } catch (error) {
            throw new Error(`Risk prediction error: ${error.message}`);
        }
    }

    /**
     * Get historical data for analysis
     */
    async getHistoricalData(assetId, assetType) {
        try {
            // Get maintenance history
            const maintenance = await pool.query(`
                SELECT COUNT(*) as total_maintenance,
                       SUM(cost) as total_maintenance_cost,
                       AVG(cost) as avg_maintenance_cost,
                       MAX(maintenance_date) as last_maintenance
                FROM maintenance_schedule
                WHERE asset_id = $1
            `, [assetId]);

            // Get complaint/incident history
            const incidents = await pool.query(`
                SELECT COUNT(*) as total_incidents,
                       MAX(created_at) as recent_incident,
                       AVG(EXTRACT(DAY FROM CURRENT_DATE - created_at)) as avg_days_since_incident
                FROM complaints
                WHERE asset_type = $1 AND created_at > CURRENT_DATE - INTERVAL '3 years'
            `, [assetType]);

            // Get historical failure patterns by asset type from ML training data
            const patterns = await pool.query(`
                SELECT * FROM asset_failure_training 
                WHERE asset_type = $1 AND failure_occurred = true
                ORDER BY failure_date DESC
            `, [assetType]);

            // Get climate data
            const climate = await pool.query(`
                SELECT * FROM climate_assessments
                WHERE asset_id = $1
                ORDER BY assessment_date DESC LIMIT 1
            `, [assetId]);

            return {
                maintenance: maintenance.rows[0],
                incidents: incidents.rows[0],
                patterns: patterns.rows,
                climate: climate.rows[0]
            };
        } catch (error) {
            console.error('Error getting historical data:', error);
            return {};
        }
    }

    /**
     * Predict 3-month failure probability
     */
    async predict3Month(historical, assetData) {
        try {
            let probability = 0.15; // Base 15% chance

            // Factor 1: Age of asset
            if (assetData.installation_date) {
                const ageYears = (new Date() - new Date(assetData.installation_date)) / (1000 * 60 * 60 * 24 * 365);
                if (ageYears > 15) probability += 0.25;
                else if (ageYears > 10) probability += 0.15;
                else if (ageYears > 5) probability += 0.08;
            }

            // Factor 2: Recent incidents
            if (historical.incidents) {
                const recentIncidents = historical.incidents.total_incidents || 0;
                if (recentIncidents > 5) probability += 0.20;
                else if (recentIncidents > 2) probability += 0.10;
            }

            // Factor 3: Maintenance frequency
            if (historical.maintenance && historical.maintenance.last_maintenance) {
                const daysSinceLastMaintenance = Math.floor(
                    (new Date() - new Date(historical.maintenance.last_maintenance)) / (1000 * 60 * 60 * 24)
                );
                if (daysSinceLastMaintenance > 365) probability += 0.20;
                else if (daysSinceLastMaintenance > 180) probability += 0.10;
            }

            // Factor 4: Climate factors
            if (historical.climate) {
                const climateRisk = (historical.climate.flood_risk || 0) +
                                   (historical.climate.heat_vulnerability || 0) +
                                   (historical.climate.environmental_impact || 0);
                probability += (climateRisk * 0.1);
            }

            // Factor 5: Asset type vulnerability
            const typeVulnerability = {
                'Water Pipeline': 0.25,
                'Sewage': 0.20,
                'Road': 0.15,
                'Bridge': 0.10,
                'Building': 0.12,
                'Electricity': 0.18,
                'Street Light': 0.08
            };
            probability += (typeVulnerability[assetData.type] || 0.15);

            // Apply decay factor (older predictions have lower weight in short term)
            const confidence = Math.min(1, (historical.patterns?.length || 5) / 50);

            return {
                probability: Math.min(1, Math.max(0, probability)),
                confidence: Math.round(confidence * 100),
                trend: 'stable'
            };
        } catch (error) {
            console.error('3-month prediction error:', error);
            return { probability: 0.3, confidence: 40, trend: 'unknown' };
        }
    }

    /**
     * Predict 6-month failure probability
     */
    async predict6Month(historical, assetData) {
        try {
            // Start with 3-month prediction and adjust
            const month3 = await this.predict3Month(historical, assetData);
            let probability = month3.probability * 1.3; // 30% increase from 3-month

            // Additional factors for medium term
            if (historical.patterns && historical.patterns.length > 0) {
                // Analyze trend in failure patterns
                const failureFrequency = this.calculateFailureFrequency(historical.patterns);
                probability += (failureFrequency * 0.2);
            }

            // Budget stress factor
            if (historical.maintenance && historical.maintenance.total_maintenance_cost) {
                // If maintenance costs rising, higher risk
                probability += 0.05;
            }

            return {
                probability: Math.min(1, Math.max(0, probability)),
                confidence: Math.round((month3.confidence * 0.9)),
                trend: this.determineTrend(historical)
            };
        } catch (error) {
            console.error('6-month prediction error:', error);
            return { probability: 0.4, confidence: 35, trend: 'unknown' };
        }
    }

    /**
     * Predict 12-month failure probability
     */
    async predict12Month(historical, assetData) {
        try {
            // Start with 6-month prediction and increase
            const month6 = await this.predict6Month(historical, assetData);
            let probability = month6.probability * 1.25; // 25% increase from 6-month

            // Long-term degradation factor
            if (assetData.installation_date) {
                const ageYears = (new Date() - new Date(assetData.installation_date)) / (1000 * 60 * 60 * 24 * 365);
                if (ageYears > 20) probability += 0.35;
                else if (ageYears > 15) probability += 0.20;
                else if (ageYears > 10) probability += 0.10;
            }

            // Seasonal factors (based on climate data and asset type)
            const seasonalRisk = await this.calculateSeasonalRisk(assetData.type);
            probability += (seasonalRisk * 0.15);

            return {
                probability: Math.min(1, Math.max(0, probability)),
                confidence: Math.round((month6.confidence * 0.8)),
                trend: month6.trend
            };
        } catch (error) {
            console.error('12-month prediction error:', error);
            return { probability: 0.5, confidence: 30, trend: 'unknown' };
        }
    }

    /**
     * Calculate failure frequency from historical data
     */
    calculateFailureFrequency(patterns) {
        if (!patterns || patterns.length === 0) return 0.1;

        try {
            // Calculate failures per year
            const failuresPerYear = patterns.length / 5; // 5 years of data

            // Normalize to 0-1
            return Math.min(1, failuresPerYear / 2); // Max 2 failures/year = 1.0
        } catch (error) {
            return 0.15;
        }
    }

    /**
     * Determine risk trend
     */
    determineTrend(historical) {
        try {
            if (!historical.patterns || historical.patterns.length < 2) return 'stable';

            const recentFailures = historical.patterns.slice(0, 3);
            const olderFailures = historical.patterns.slice(-3);

            const recentFrequency = recentFailures.length;
            const olderFrequency = olderFailures.length;

            if (recentFrequency > olderFrequency * 1.3) return 'increasing';
            else if (recentFrequency < olderFrequency * 0.7) return 'decreasing';
            else return 'stable';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Calculate seasonal risk based on asset type and climate
     */
    async calculateSeasonalRisk(assetType) {
        const currentMonth = new Date().getMonth();

        const seasonalRisks = {
            'Water Pipeline': {
                summer: 0.25,    // Dry season stress
                monsoon: 0.35,   // Burst risk
                winter: 0.15
            },
            'Road': {
                summer: 0.10,
                monsoon: 0.40,   // Water damage
                winter: 0.12
            },
            'Bridge': {
                summer: 0.08,
                monsoon: 0.30,   // Flood damage
                winter: 0.10
            },
            'Sewage': {
                summer: 0.20,
                monsoon: 0.45,   // Overflow
                winter: 0.12
            }
        };

        const assetSeasonalRisks = seasonalRisks[assetType] || { summer: 0.15, monsoon: 0.25, winter: 0.10 };

        // Determine current season
        if (currentMonth >= 2 && currentMonth <= 5) return assetSeasonalRisks.summer || 0.15;
        else if (currentMonth >= 6 && currentMonth <= 9) return assetSeasonalRisks.monsoon || 0.25;
        else return assetSeasonalRisks.winter || 0.12;
    }

    /**
     * Identify key risk factors
     */
    async identifyRiskFactors(assetId, historical) {
        const factors = [];

        if (historical.incidents && historical.incidents.total_incidents > 5) {
            factors.push({
                factor: 'High Incident Rate',
                severity: 'high',
                description: `${historical.incidents.total_incidents} incidents in past 3 years`
            });
        }

        if (historical.maintenance && historical.maintenance.last_maintenance) {
            const daysSinceLastMaint = Math.floor(
                (new Date() - new Date(historical.maintenance.last_maintenance)) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceLastMaint > 365) {
                factors.push({
                    factor: 'Overdue Maintenance',
                    severity: 'high',
                    description: `Last maintenance ${daysSinceLastMaint} days ago`
                });
            }
        }

        if (historical.climate) {
            if (historical.climate.flood_risk > 0.7) {
                factors.push({
                    factor: 'High Flood Risk',
                    severity: 'high',
                    description: `Flood risk score: ${Math.round(historical.climate.flood_risk * 100)}%`
                });
            }

            if (historical.climate.heat_vulnerability > 0.8) {
                factors.push({
                    factor: 'Heat Vulnerability',
                    severity: 'medium',
                    description: `High heat exposure risk`
                });
            }
        }

        return factors;
    }

    /**
     * Generate risk-based recommendations
     */
    async generateRiskRecommendations(assetData, historical) {
        const recommendations = [];

        if (historical.incidents && historical.incidents.total_incidents > 5) {
            recommendations.push({
                action: 'Increase monitoring frequency',
                priority: 'high',
                timeframe: 'immediate'
            });
        }

        if (historical.maintenance && historical.maintenance.total_maintenance > 0) {
            const avgMaintenanceCost = historical.maintenance.avg_maintenance_cost || 0;
            if (avgMaintenanceCost > 100000) {
                recommendations.push({
                    action: 'Consider asset replacement - high maintenance costs',
                    priority: 'medium',
                    timeframe: '6 months'
                });
            }
        }

        if (assetData.installation_date) {
            const ageYears = (new Date() - new Date(assetData.installation_date)) / (1000 * 60 * 60 * 24 * 365);
            if (ageYears > 20) {
                recommendations.push({
                    action: 'Asset nearing end of life - plan replacement',
                    priority: 'medium',
                    timeframe: '12 months'
                });
            }
        }

        return recommendations;
    }

    /**
     * Store prediction in database
     */
    async storePrediction(assetId, failureProbability) {
        try {
            // Delete old predictions (keep only last 12)
            await pool.query(`
                DELETE FROM ml_predictions
                WHERE asset_id = $1
                AND id NOT IN (
                    SELECT id FROM ml_predictions
                    WHERE asset_id = $1
                    ORDER BY created_at DESC LIMIT 12
                )
            `, [assetId]);

            // Insert new prediction
            await pool.query(`
                INSERT INTO ml_predictions (asset_id, prediction_type, failure_probability, confidence_score, created_at)
                VALUES ($1, 'compound_risk', $2, 0.75, CURRENT_TIMESTAMP)
            `, [assetId, failureProbability]);
        } catch (error) {
            console.error('Error storing prediction:', error);
        }
    }

    /**
     * Get prediction history for an asset
     */
    async getPredictionHistory(assetId, months = 12) {
        try {
            const result = await pool.query(`
                SELECT * FROM ml_predictions
                WHERE asset_id = $1
                AND created_at > CURRENT_DATE - INTERVAL '${months} months'
                ORDER BY created_at ASC
            `, [assetId]);

            return result.rows;
        } catch (error) {
            throw new Error(`Prediction history error: ${error.message}`);
        }
    }

    /**
     * Get risk metrics for dashboard
     */
    async getRiskMetrics() {
        try {
            const result = await pool.query(`
                SELECT asset_id, failure_probability, created_at
                FROM ml_predictions
                WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
                ORDER BY created_at DESC
            `);

            const riskDistribution = {
                high: result.rows.filter(r => r.failure_probability > 0.7).length,
                medium: result.rows.filter(r => r.failure_probability > 0.4 && r.failure_probability <= 0.7).length,
                low: result.rows.filter(r => r.failure_probability <= 0.4).length
            };

            const averageRisk = result.rows.length > 0 ?
                Math.round(result.rows.reduce((sum, r) => sum + r.failure_probability, 0) / result.rows.length * 100) :
                0;

            return {
                riskDistribution,
                averageRisk,
                totalAssets: result.rows.length,
                predictions: result.rows
            };
        } catch (error) {
            throw new Error(`Risk metrics error: ${error.message}`);
        }
    }
}

module.exports = new RiskPredictionService();
