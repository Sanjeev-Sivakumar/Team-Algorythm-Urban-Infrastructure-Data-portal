/**
 * Infrastructure Criticality Index Engine (Module 6)
 * VERY IMPORTANT: Calculates which asset collapse would hurt the city most
 * 
 * Formula:
 * Criticality Score = Risk Level × Population Impact × Economic Value × Service Dependency
 * This tells which asset should be prioritized for intervention
 */

const pool = require('../config/db');

class CriticalityIndexService {
    /**
     * Calculate criticality score for an asset
     * Combines risk, population impact, economic value, and service dependency
     */
    async calculateCriticalityScore(assetId) {
        try {
            const asset = await pool.query('SELECT * FROM assets WHERE id = $1', [assetId]);
            if (asset.rows.length === 0) throw new Error('Asset not found');

            const assetData = asset.rows[0];

            // Get components
            const riskLevel = await this.calculateRiskLevel(assetId);
            const populationImpact = await this.calculatePopulationImpact(assetData);
            const economicValue = await this.calculateEconomicValue(assetId, assetData);
            const serviceDependency = await this.calculateServiceDependency(assetData.type);

            // Main formula: Risk × Population × Economic × Dependency
            // Each factor normalized to 0-1 scale
            const criticalityScore = (riskLevel * populationImpact * economicValue * serviceDependency) * 100;

            // Determine criticality level
            let level = 'Low';
            if (criticalityScore >= 70) level = 'Critical';
            else if (criticalityScore >= 40) level = 'High';
            else if (criticalityScore >= 20) level = 'Medium';

            return {
                assetId,
                assetName: assetData.name,
                assetType: assetData.type,
                criticalityScore: Math.round(criticalityScore * 100) / 100,
                level,
                components: {
                    riskLevel: Math.round(riskLevel * 1000) / 10,
                    populationImpact: Math.round(populationImpact * 1000) / 10,
                    economicValue: Math.round(economicValue * 1000) / 10,
                    serviceDependency: Math.round(serviceDependency * 1000) / 10
                },
                impactAnalysis: await this.analyzeImpact(assetData, criticalityScore),
                recommendations: this.generateRecommendations(level, riskLevel, populationImpact, economicValue, serviceDependency)
            };
        } catch (error) {
            throw new Error(`Criticality calculation error: ${error.message}`);
        }
    }

    /**
     * Risk Level (0-1): Based on health score and ML predictions
     * Collapse probability
     */
    async calculateRiskLevel(assetId) {
        try {
            // Get asset health score
            const healthResult = await pool.query(`
                SELECT status FROM assets WHERE id = $1
            `, [assetId]);

            let healthRisk = 0.3; // Default
            const status = healthResult.rows[0]?.status;
            
            if (status === 'Critical') healthRisk = 0.9;
            else if (status === 'Maintenance') healthRisk = 0.6;
            else if (status === 'Good') healthRisk = 0.2;

            // Get ML prediction
            const mlResult = await pool.query(`
                SELECT failure_probability FROM ml_predictions
                WHERE asset_id = $1
                ORDER BY created_at DESC LIMIT 1
            `, [assetId]);

            const mlRisk = mlResult.rows[0]?.failure_probability || 0.3;

            // Weighted average
            const riskLevel = (healthRisk * 0.4) + (mlRisk * 0.6);
            return Math.min(1, Math.max(0, riskLevel));
        } catch (error) {
            console.error('Risk level calculation error:', error);
            return 0.5;
        }
    }

    /**
     * Population Impact (0-1): How many people depend on this asset
     * Based on asset type and location population
     */
    async calculatePopulationImpact(assetData) {
        try {
            const populationWeights = {
                'Water Pipeline': 0.95,      // Critical - everyone needs water
                'Sewage': 0.95,              // Critical - public health
                'Road': 0.85,                // Very high - transportation
                'Bridge': 0.90,              // Very high - connectivity
                'Electricity': 0.88,         // Very high - essential service
                'Street Light': 0.40,        // Medium - safety
                'Public Facility': 0.70,     // High - depends on type
                'Building': 0.60,            // Medium-High
                'Park': 0.30                 // Low - leisure
            };

            const baseWeight = populationWeights[assetData.type] || 0.5;

            // Check for special geographical importance (PostGIS)
            if (assetData.geometry) {
                // Check if in high-traffic areas (simplified - in real system, check against district density data)
                const areaImportance = await this.checkAreaImportance(assetData.geometry);
                return Math.min(1, baseWeight + (areaImportance * 0.15));
            }

            return baseWeight;
        } catch (error) {
            console.error('Population impact calculation error:', error);
            return 0.6;
        }
    }

    /**
     * Economic Value (0-1): Reconstruction cost and economic loss if failed
     */
    async calculateEconomicValue(assetId, assetData) {
        try {
            // Get historical costs
            const costResult = await pool.query(`
                SELECT 
                    AVG(cost) as avg_cost,
                    MAX(cost) as max_cost,
                    COUNT(*) as maintenance_count
                FROM maintenance_schedule
                WHERE asset_id = $1
            `, [assetId]);

            const avgCost = costResult.rows[0]?.avg_cost || 50000;
            const maxCost = costResult.rows[0]?.max_cost || 500000;

            // Asset type base value (estimated reconstruction cost in millions)
            const assetTypeValues = {
                'Water Pipeline': 50,        // 50M per km
                'Road': 30,                  // 30M per km
                'Bridge': 100,               // 100M+ per bridge
                'Sewage': 40,                // 40M per km
                'Building': 80,              // 80M per building
                'Electricity': 25,           // 25M per segment
                'Street Light': 1,           // 1M per segment
                'Public Facility': 15,       // Varies
                'Park': 5                    // 5M
            };

            const baseValue = assetTypeValues[assetData.type] || 20;

            // Economic loss factors
            // Each day of downtime causes losses
            const dailyEconomicLoss = {
                'Water Pipeline': 5,         // 5M per day
                'Road': 3,                   // 3M per day
                'Bridge': 8,                 // 8M per day
                'Sewage': 4,                 // 4M per day
                'Electricity': 6,            // 6M per day
                'Street Light': 0.1,         // 0.1M per day
                'Building': 2,               
                'Public Facility': 1,
                'Park': 0.05
            };

            const dailyLoss = dailyEconomicLoss[assetData.type] || 1;

            // Normalized score: higher cost = higher value (0-1)
            const economicScore = Math.min(1, (baseValue + dailyLoss) / 150);

            return economicScore;
        } catch (error) {
            console.error('Economic value calculation error:', error);
            return 0.6;
        }
    }

    /**
     * Service Dependency (0-1): How dependent are other systems on this asset
     */
    async calculateServiceDependency(assetType) {
        try {
            // Check cascading failure patterns from ML data
            const cascadeResult = await pool.query(`
                SELECT AVG(cascade_probability) as avg_cascade
                FROM cascading_failures
                WHERE primary_asset_type = $1
            `, [assetType]);

            const cascadeProbability = cascadeResult.rows[0]?.avg_cascade || 0.3;

            // Dependency weights based on asset type
            const dependencyWeights = {
                'Water Pipeline': 0.95,      // Other systems depend on water
                'Sewage': 0.90,              // Critical for public health
                'Road': 0.80,                // Traffic dependency
                'Bridge': 0.85,              // Connectivity dependency
                'Electricity': 0.92,         // Everything depends on power
                'Street Light': 0.30,        // Limited dependency
                'Public Facility': 0.50,
                'Building': 0.40,
                'Park': 0.10
            };

            const baseWeight = dependencyWeights[assetType] || 0.5;

            // Final score: base + cascade effect
            const serviceDependency = (baseWeight * 0.7) + (cascadeProbability * 0.3);
            return Math.min(1, Math.max(0, serviceDependency));
        } catch (error) {
            console.error('Service dependency calculation error:', error);
            return 0.6;
        }
    }

    /**
     * Analyze potential impact if this asset fails
     */
    async analyzeImpact(assetData, criticalityScore) {
        const impacts = {
            immediate: [],
            shortTerm: [],
            longTerm: []
        };

        const assetType = assetData.type;

        if (assetType === 'Water Pipeline' && criticalityScore > 50) {
            impacts.immediate.push('Water supply disruption to city');
            impacts.shortTerm.push('Public health crisis within hours');
            impacts.longTerm.push('Disease outbreak risk, economic damage');
        }

        if (assetType === 'Sewage' && criticalityScore > 50) {
            impacts.immediate.push('Sewage backup in affected areas');
            impacts.shortTerm.push('Sanitation emergency within 6 hours');
            impacts.longTerm.push('Environmental contamination, disease spread');
        }

        if ((assetType === 'Road' || assetType === 'Bridge') && criticalityScore > 50) {
            impacts.immediate.push('Traffic disruption');
            impacts.shortTerm.push('Economic loss from delayed commerce');
            impacts.longTerm.push('Reduced commercial activity, revenue loss');
        }

        if (assetType === 'Electricity' && criticalityScore > 50) {
            impacts.immediate.push('Power outage across city zones');
            impacts.shortTerm.push('Hospital, emergency services affected');
            impacts.longTerm.push('Cascading failures in dependent systems');
        }

        return impacts;
    }

    /**
     * Generate recommendations based on criticality
     */
    generateRecommendations(level, risk, population, economic, dependency) {
        const recommendations = [];

        if (level === 'Critical') {
            recommendations.push({
                priority: 1,
                action: 'URGENT: Schedule emergency inspection',
                timeframe: '24 hours'
            });
            recommendations.push({
                priority: 1,
                action: 'Develop contingency response plan',
                timeframe: 'Immediate'
            });
            recommendations.push({
                priority: 1,
                action: 'Allocate emergency repair budget',
                timeframe: 'Immediate'
            });
        }

        if (level === 'High') {
            recommendations.push({
                priority: 2,
                action: 'Schedule preventive maintenance',
                timeframe: '1 week'
            });
            recommendations.push({
                priority: 2,
                action: 'Monitor continuously',
                timeframe: 'Ongoing'
            });
        }

        if (risk > 0.7) {
            recommendations.push({
                priority: 1,
                action: 'High failure risk - immediate intervention needed',
                timeframe: '48 hours'
            });
        }

        if (population > 0.85) {
            recommendations.push({
                priority: 2,
                action: 'Public communication plan required',
                timeframe: 'Before any intervention'
            });
        }

        if (dependency > 0.80) {
            recommendations.push({
                priority: 2,
                action: 'Coordinate with dependent system operators',
                timeframe: 'Before maintenance'
            });
        }

        return recommendations;
    }

    /**
     * Check area importance based on geometry (simplified)
     */
    async checkAreaImportance(geometry) {
        // In a real implementation, this would query districts with high population
        // For now, return a base value
        return 0.1;
    }

    /**
     * Get criticality leaderboard - top urgent assets
     */
    async getCriticalityLeaderboard(limit = 20) {
        try {
            const result = await pool.query('SELECT id FROM assets LIMIT 100');
            const assetIds = result.rows.map(r => r.id);

            const scores = [];
            for (const id of assetIds) {
                try {
                    const score = await this.calculateCriticalityScore(id);
                    scores.push(score);
                } catch (error) {
                    console.error(`Error calculating criticality for asset ${id}:`, error);
                }
            }

            // Sort by criticality score descending
            scores.sort((a, b) => b.criticalityScore - a.criticalityScore);

            return {
                leaderboard: scores.slice(0, limit),
                totalAssets: assetIds.length,
                criticalCount: scores.filter(s => s.level === 'Critical').length,
                highCount: scores.filter(s => s.level === 'High').length
            };
        } catch (error) {
            throw new Error(`Criticality leaderboard error: ${error.message}`);
        }
    }

    /**
     * Get criticality distribution
     */
    async getCriticalityDistribution() {
        try {
            const result = await pool.query('SELECT id FROM assets');
            const assetIds = result.rows.map(r => r.id);

            const scores = [];
            for (const id of assetIds) {
                try {
                    const score = await this.calculateCriticalityScore(id);
                    scores.push(score);
                } catch (error) {
                    console.error(`Error calculating criticality for asset ${id}:`, error);
                }
            }

            return {
                critical: scores.filter(s => s.level === 'Critical').length,
                high: scores.filter(s => s.level === 'High').length,
                medium: scores.filter(s => s.level === 'Medium').length,
                low: scores.filter(s => s.level === 'Low').length,
                averageCriticality: Math.round(
                    scores.reduce((sum, s) => sum + s.criticalityScore, 0) / scores.length
                ),
                allScores: scores
            };
        } catch (error) {
            throw new Error(`Criticality distribution error: ${error.message}`);
        }
    }
}

module.exports = new CriticalityIndexService();
