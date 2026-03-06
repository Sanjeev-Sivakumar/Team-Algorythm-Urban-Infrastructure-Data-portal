/**
 * Climate & Environmental Risk Analysis (Module 14)
 * Analyzes infrastructure resilience against climate threats
 */

const pool = require('../config/db');

class ClimateRiskService {
    /**
     * Assess climate risks for an asset
     */
    async assessClimateRisks(assetId) {
        try {
            const result = await pool.query(`
                SELECT a.*, ca.* FROM assets a
                LEFT JOIN climate_assessments ca ON a.id = ca.asset_id
                WHERE a.id = $1
                ORDER BY ca.assessment_date DESC LIMIT 1
            `, [assetId]);

            if (result.rows.length === 0) throw new Error('Asset not found');

            const assetData = result.rows[0];

            const assessment = {
                assetId,
                assetName: assetData.name,
                assetType: assetData.type,
                threatAssessment: await this.assessThreats(assetData),
                vulnerabilityMetrics: await this.calculateVulnerabilityMetrics(assetData),
                resilienceScore: await this.calculateResilienceScore(assetData),
                recommendations: await this.generateClimateRecommendations(assetData),
                projections: await this.generateFutureProjections(assetData)
            };

            return assessment;
        } catch (error) {
            throw new Error(`Climate risk assessment error: ${error.message}`);
        }
    }

    /**
     * Assess specific climate threats
     */
    async assessThreats(assetData) {
        const threats = {
            flood_risk: this.assessFloodRisk(assetData),
            heat_exposure: this.assessHeatExposure(assetData),
            extreme_weather: this.assessExtremeWeather(assetData),
            sea_level_rise: this.assessSeaLevelRise(assetData),
            drought_stress: this.assessDroughtStress(assetData)
        };

        return threats;
    }

    /**
     * Assess flood risk
     */
    assessFloodRisk(assetData) {
        const assetTypeFloodRisk = {
            'Water Pipeline': 0.85,        // High risk - water systems affected by flooding
            'Sewage': 0.80,                // High risk - backup during floods
            'Road': 0.70,                  // Medium-High - surfaces damaged
            'Bridge': 0.75,                // High - structural stress
            'Building': 0.60,              // Medium - foundation risks
            'Electricity': 0.65,           // Medium-High - electrical hazards
            'Street Light': 0.50,          // Medium
            'Public Facility': 0.55,       // Medium
            'Park': 0.40                   // Lower risk
        };

        const baseRisk = assetTypeFloodRisk[assetData.type] || 0.5;

        // Seasonal adjustment
        const currentMonth = new Date().getMonth();
        const rainyMonths = [6, 7, 8, 9]; // Jun-Sep (monsoon)
        const seasonalMultiplier = rainyMonths.includes(currentMonth) ? 1.3 : 1.0;

        const riskScore = Math.min(1, baseRisk * seasonalMultiplier);

        return {
            score: Math.round(riskScore * 100),
            level: riskScore > 0.7 ? 'High' : riskScore > 0.4 ? 'Medium' : 'Low',
            description: this.getFloodRiskDescription(riskScore, assetData.type)
        };
    }

    /**
     * Assess heat exposure
     */
    assessHeatExposure(assetData) {
        const assetTypeHeatSensitivity = {
            'Water Pipeline': 0.65,        // Thermal expansion
            'Electricity': 0.80,           // Power lines suffer
            'Road': 0.75,                  // Asphalt degrades
            'Building': 0.70,              // Structure stress
            'Sewage': 0.60,
            'Bridge': 0.55,                // Metal expands
            'Street Light': 0.50,
            'Public Facility': 0.65,
            'Park': 0.40
        };

        const baseSensitivity = assetTypeHeatSensitivity[assetData.type] || 0.5;

        // Summer adjustment
        const currentMonth = new Date().getMonth();
        const summerMonths = [4, 5]; // May-Jun peak heat
        const seasonalMultiplier = summerMonths.includes(currentMonth) ? 1.4 : 1.0;

        const riskScore = Math.min(1, baseSensitivity * seasonalMultiplier);

        return {
            score: Math.round(riskScore * 100),
            level: riskScore > 0.7 ? 'High' : riskScore > 0.4 ? 'Medium' : 'Low',
            description: `Asset type ${assetData.type} has ${riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low'} heat sensitivity`
        };
    }

    /**
     * Assess extreme weather
     */
    assessExtremeWeather(assetData) {
        const assetTypeExtremeWeatherRisk = {
            'Bridge': 0.75,                // Wind, vibration
            'Road': 0.65,                  // Flash floods
            'Building': 0.70,              // Multiple impacts
            'Electricity': 0.80,           // Lightning, storms
            'Street Light': 0.60,
            'Water Pipeline': 0.55,
            'Sewage': 0.50,
            'Public Facility': 0.60,
            'Park': 0.35
        };

        const baseRisk = assetTypeExtremeWeatherRisk[assetData.type] || 0.5;

        return {
            score: Math.round(baseRisk * 100),
            level: baseRisk > 0.7 ? 'High' : baseRisk > 0.4 ? 'Medium' : 'Low',
            extremeEvents: ['Cyclone/Hurricane', 'Severe Windstorm', 'Lightning Strike', 'Flash Flood'],
            description: 'Risk of damage from extreme weather events'
        };
    }

    /**
     * Assess sea level rise impact (if coastal)
     */
    assessSeaLevelRise(assetData) {
        // Simplified - in real implementation would check latitude/longitude
        const isCoastal = false; // Assume not coastal for Madurai

        if (!isCoastal) {
            return {
                score: 0,
                level: 'Not Applicable',
                description: 'Asset is not in coastal zone'
            };
        }

        // 30cm rise expected by 2050
        return {
            score: 35,
            level: 'Medium',
            projectedRise2050: '30cm',
            description: 'Projected impact by 2050'
        };
    }

    /**
     * Assess drought stress
     */
    assessDroughtStress(assetData) {
        const assetTypeDroughtStress = {
            'Water Pipeline': 0.85,        // Severe stress during drought
            'Park': 0.70,                  // Vegetation stress
            'Building': 0.40,              // Minimal direct impact
            'Road': 0.35,
            'Sewage': 0.60,                // Low water levels
            'Electricity': 0.50,
            'Street Light': 0.20,
            'Bridge': 0.30,
            'Public Facility': 0.45
        };

        const baseStress = assetTypeDroughtStress[assetData.type] || 0.4;

        // Intensity increases during dry season (Apr-May)
        const currentMonth = new Date().getMonth();
        const dryMonths = [3, 4]; // Apr-May
        const seasonalMultiplier = dryMonths.includes(currentMonth) ? 1.5 : 1.0;

        const stressScore = Math.min(1, baseStress * seasonalMultiplier);

        return {
            score: Math.round(stressScore * 100),
            level: stressScore > 0.7 ? 'High' : stressScore > 0.4 ? 'Medium' : 'Low',
            description: `Asset vulnerable to water stress during drought periods`
        };
    }

    /**
     * Calculate vulnerability metrics
     */
    async calculateVulnerabilityMetrics(assetData) {
        try {
            const climateResult = await pool.query(`
                SELECT * FROM climate_assessments
                WHERE asset_id = $1
                ORDER BY assessment_date DESC LIMIT 1
            `, [assetData.id]);

            if (climateResult.rows.length === 0) {
                return {
                    floodVulnerability: 50,
                    heatVulnerability: 50,
                    environmentalImpact: 50,
                    averageVulnerability: 50
                };
            }

            const climate = climateResult.rows[0];

            return {
                floodVulnerability: Math.round(climate.flood_risk * 100),
                heatVulnerability: Math.round(climate.heat_vulnerability * 100),
                environmentalImpact: Math.round(climate.environmental_impact * 100),
                averageVulnerability: Math.round(
                    ((climate.flood_risk || 0.5) + (climate.heat_vulnerability || 0.5) + (climate.environmental_impact || 0.5)) / 3 * 100
                )
            };
        } catch (error) {
            console.error('Vulnerability metrics calculation error:', error);
            return {
                floodVulnerability: 50,
                heatVulnerability: 50,
                environmentalImpact: 50,
                averageVulnerability: 50
            };
        }
    }

    /**
     * Calculate climate resilience score
     */
    async calculateResilienceScore(assetData) {
        try {
            const climateResult = await pool.query(`
                SELECT resilience_score FROM climate_assessments
                WHERE asset_id = $1
                ORDER BY assessment_date DESC LIMIT 1
            `, [assetData.id]);

            let resilience = 60; // Default

            if (climateResult.rows.length > 0) {
                resilience = Math.round(climateResult.rows[0].resilience_score * 100);
            }

            return {
                score: resilience,
                level: resilience > 75 ? 'Resilient' : resilience > 50 ? 'Moderate' : 'Vulnerable',
                description: this.getResilienceDescription(resilience),
                improvementPotential: 100 - resilience
            };
        } catch (error) {
            console.error('Resilience score calculation error:', error);
            return { score: 60, level: 'Moderate', description: '', improvementPotential: 40 };
        }
    }

    /**
     * Generate recommendations for climate adaptation
     */
    async generateClimateRecommendations(assetData) {
        const recommendations = [];
        const threats = await this.assessThreats(assetData);

        if (threats.flood_risk.score > 70) {
            recommendations.push({
                priority: 'High',
                measure: 'Flood Resilience Enhancement',
                actions: [
                    'Install drainage systems',
                    'Elevate critical components',
                    'Add waterproof protection'
                ],
                cost_estimate: 'High',
                co2_offset: 'Moderate'
            });
        }

        if (threats.heat_exposure.score > 70) {
            recommendations.push({
                priority: 'High',
                measure: 'Heat Mitigation',
                actions: [
                    'Install shade structures',
                    'Use heat-resistant materials',
                    'Improve ventilation'
                ],
                cost_estimate: 'Medium',
                co2_offset: 'High'
            });
        }

        if (threats.drought_stress.score > 70) {
            recommendations.push({
                priority: 'Medium',
                measure: 'Water Conservation',
                actions: [
                    'Implement water recycling',
                    'Use drought-resistant vegetation',
                    'Optimize irrigation systems'
                ],
                cost_estimate: 'Medium',
                co2_offset: 'Low'
            });
        }

        recommendations.push({
            priority: 'Medium',
            measure: 'Climate Monitoring Installation',
            actions: [
                'Install weather stations',
                'Deploy IoT sensors',
                'Real-time alert system'
            ],
            cost_estimate: 'Low',
            co2_offset: 'Low'
        });

        return recommendations;
    }

    /**
     * Generate future climate projections
     */
    async generateFutureProjections(assetData) {
        return {
            projection_2030: {
                floodRiskIncrease: '+15%',
                heatExposureIncrease: '+20%',
                description: 'Expected climate impact based on IPCC scenarios'
            },
            projection_2050: {
                floodRiskIncrease: '+35%',
                heatExposureIncrease: '+45%',
                seaLevelRise: '+30cm (if coastal)',
                description: 'Long-term climate adaptation needed'
            },
            recommendations_urgent: [
                'Monitor climate indicators regularly',
                'Update asset design standards',
                'Plan for climate-resilient upgrades',
                'Train staff on climate adaptation'
            ]
        };
    }

    /**
     * Helper: Get flood risk description based on score
     */
    getFloodRiskDescription(score, assetType) {
        if (score > 0.7) {
            return `${assetType} has high susceptibility to flooding. Immediate flood-proofing measures recommended.`;
        } else if (score > 0.4) {
            return `${assetType} has moderate flood risk. Consider preventive measures.`;
        } else {
            return `${assetType} has low flood risk.`;
        }
    }

    /**
     * Helper: Get resilience description
     */
    getResilienceDescription(score) {
        if (score > 75) {
            return 'Asset is well-adapted to current and projected climate conditions';
        } else if (score > 50) {
            return 'Asset has moderate resilience. Some adaptation measures recommended';
        } else {
            return 'Asset vulnerable to climate impacts. Urgent adaptation needed';
        }
    }

    /**
     * Get district-level climate analysis
     */
    async getDistrictClimateAnalysis() {
        try {
            const result = await pool.query(`
                SELECT district, 
                       AVG(flood_risk_score) as avg_flood,
                       AVG(heat_vulnerability_score) as avg_heat,
                       AVG(resilience_score) as avg_resilience,
                       COUNT(*) as asset_count
                FROM climate_risk_data
                GROUP BY district
            `);

            return result.rows;
        } catch (error) {
            throw new Error(`District climate analysis error: ${error.message}`);
        }
    }
}

module.exports = new ClimateRiskService();
