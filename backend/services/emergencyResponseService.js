/**
 * Emergency Response Optimization Module (Module 15)
 * When failure detected, system suggests nearest contractor, emergency team, fastest route, resource allocation
 */

const pool = require('../config/db');

class EmergencyResponseService {
    /**
     * Generate emergency response plan for asset failure
     */
    async generateEmergencyResponse(assetId, failureType) {
        try {
            const asset = await pool.query('SELECT * FROM assets WHERE id = $1', [assetId]);
            if (asset.rows.length === 0) throw new Error('Asset not found');

            const assetData = asset.rows[0];

            const response = {
                assetId,
                assetName: assetData.name,
                assetType: assetData.type,
                failureType,
                responseGeneratedAt: new Date(),
                priority: await this.determinePriority(assetData, failureType),
                optimalContractor: await this.selectOptimalContractor(assetData),
                emergencyTeam: await this.assembleEmergencyTeam(assetData),
                estimatedResponseTime: await this.estimateResponseTime(assetData),
                requiredResources: await this.calculateRequiredResources(assetData, failureType),
                communicationPlan: await this.generateCommunicationPlan(assetData),
                alternativeActions: await this.generateAlternativeActions(assetData, failureType)
            };

            return response;
        } catch (error) {
            throw new Error(`Emergency response generation error: ${error.message}`);
        }
    }

    /**
     * Determine response priority
     */
    async determinePriority(assetData, failureType) {
        const priorityMap = {
            'Water Pipeline': 'Critical',
            'Sewage': 'Critical',
            'Electricity': 'Critical',
            'Bridge': 'High',
            'Road': 'High',
            'Building': 'Medium',
            'Street Light': 'Low',
            'Public Facility': 'Medium',
            'Park': 'Low'
        };

        const basePriority = priorityMap[assetData.type] || 'Medium';

        // Increase priority for severe failures
        if (failureType === 'Complete Failure' || failureType === 'Structural Collapse') {
            return 'Critical';
        }

        return basePriority;
    }

    /**
     * Select optimal contractor for emergency
     */
    async selectOptimalContractor(assetData) {
        try {
            // Get available contractors with good performance from ML data
            const result = await pool.query(`
                SELECT contractor_name, quality_rating, reliability_score, 
                       project_count, cost_efficiency
                FROM contractor_performance
                WHERE reliability_score > 0.8
                ORDER BY reliability_score DESC, quality_rating DESC
                LIMIT 5
            `);

            if (result.rows.length === 0) {
                return {
                    contractor: 'Emergency Contractor Pool',
                    reason: 'No pre-qualified contractors available',
                    alternatives: []
                };
            }

            const topContractor = result.rows[0];
            const alternatives = result.rows.slice(1);

            return {
                recommended: {
                    name: topContractor.contractor_name,
                    qualityRating: parseFloat(topContractor.quality_rating),
                    reliabilityScore: parseFloat(topContractor.reliability_score),
                    estimatedResponseTime: '30-45 minutes',
                    contactPriority: 1
                },
                alternatives: alternatives.map((c, idx) => ({
                    name: c.contractor_name,
                    qualityRating: parseFloat(c.quality_rating),
                    reliabilityScore: parseFloat(c.reliability_score),
                    estimatedResponseTime: `${45 + (idx * 15)}-${60 + (idx * 15)} minutes`,
                    contactPriority: idx + 2
                }))
            };
        } catch (error) {
            console.error('Contractor selection error:', error);
            return {
                recommended: { name: 'Default Contractor', estimatedResponseTime: '1 hour' },
                alternatives: []
            };
        }
    }

    /**
     * Assemble emergency team
     */
    async assembleEmergencyTeam(assetData) {
        const assetTypeTeams = {
            'Water Pipeline': {
                teamLead: 'Senior Water Systems Engineer',
                members: ['Plumber', 'Machine Operator', 'Site Safety Officer', 'Quality Inspector'],
                equipment: ['Pressure Testing Kit', 'Repair Materials', 'Excavation Equipment', 'Safety Gear']
            },
            'Sewage': {
                teamLead: 'Senior Sanitation Engineer',
                members: ['Plumbing Specialist', 'Heavy Equipment Operator', 'Safety Officer', 'Health Inspector'],
                equipment: ['Cleaning Equipment', 'Pipe Repair Kit', 'Safety Equipment', 'Disposal Truck']
            },
            'Electricity': {
                teamLead: 'Senior Electrical Engineer',
                members: ['Licensed Electrician', 'High Voltage Specialist', 'Safety Officer', 'Line Worker'],
                equipment: ['Testing Equipment', 'Replacement Components', 'Safety Harness', 'Traffic Control']
            },
            'Road': {
                teamLead: 'Senior Civil Engineer',
                members: ['Road Construction Specialist', 'Equipment Operator', 'Safety Officer', 'Traffic Manager'],
                equipment: ['Paving Equipment', 'Patching Materials', 'Traffic Cones', 'Safety Signs']
            },
            'Bridge': {
                teamLead: 'Bridge Structural Engineer',
                members: ['Structural Specialist', 'Crane Operator', 'Safety Officer', 'Inspector'],
                equipment: ['Diagnostic Equipment', 'Repair Materials', 'Scaffolding', 'Safety Equipment']
            }
        };

        const team = assetTypeTeams[assetData.type] || {
            teamLead: 'General Maintenance Manager',
            members: ['Technician', 'Assistant', 'Safety Officer'],
            equipment: ['Basic Tools', 'Safety Equipment']
        };

        return {
            ...team,
            assemblyTime: '15-20 minutes',
            departureTime: 'Immediate',
            estimatedArrival: '45-60 minutes'
        };
    }

    /**
     * Estimate emergency response time
     */
    async estimateResponseTime(assetData) {
        const baseResponseTime = {
            'Water Pipeline': 20,
            'Sewage': 20,
            'Electricity': 15,
            'Bridge': 25,
            'Road': 30,
            'Building': 35,
            'Street Light': 40,
            'Public Facility': 35,
            'Park': 45
        };

        const travelTime = baseResponseTime[assetData.type] || 30;
        const assemblyTime = 15;
        const setupTime = 10;

        return {
            teamAssemblyMinutes: assemblyTime,
            estimatedTravelMinutes: travelTime,
            onSiteSetupMinutes: setupTime,
            totalResponseTimeMinutes: assemblyTime + travelTime + setupTime,
            workStartTime: `T+${assemblyTime + travelTime + setupTime} minutes`,
            timeToContainEmergency: this.getContainmentTime(assetData.type)
        };
    }

    /**
     * Get estimated time to contain emergency
     */
    getContainmentTime(assetType) {
        const containmentTimes = {
            'Water Pipeline': '30-45 minutes (isolation and repair)',
            'Sewage': '45-60 minutes (cleaningand repair)',
            'Electricity': '20-30 minutes (restore supply or bypass)',
            'Bridge': '2-4 hours (structural evaluation)',
            'Road': '1-2 hours (patch/repair)',
            'Building': '1-3 hours (assessment and initial repair)',
            'Street Light': '30 minutes (replacement)',
            'Public Facility': '2-4 hours (assessment and repair)',
            'Park': '2-3 hours (isolation and repair)'
        };

        return containmentTimes[assetType] || '2-4 hours';
    }

    /**
     * Calculate required resources
     */
    async calculateRequiredResources(assetData, failureType) {
        const resources = {
            personnel: 0,
            heavy_equipment: [],
            materials: [],
            vehicles: [],
            estimated_cost: 0
        };

        // Personnel based on asset type and severity
        const basePersonnel = {
            'Water Pipeline': 3,
            'Sewage': 4,
            'Electricity': 3,
            'Bridge': 5,
            'Road': 4,
            'Building': 3,
            'Street Light': 2,
            'Public Facility': 3,
            'Park': 2
        };

        resources.personnel = (basePersonnel[assetData.type] || 3) + 
                             (failureType === 'Complete Failure' ? 2 : 0);

        // Equipment and materials
        const equipmentMap = {
            'Water Pipeline': {
                equipment: ['Excavator', 'Pressure Test Kit', 'Replacement Pipe'],
                vehicles: ['Repair Truck', 'Crane'],
                cost: 50000
            },
            'Sewage': {
                equipment: ['Excavator', 'Cleaning Equipment', 'Pipe Sections'],
                vehicles: ['Pump Truck', 'Excavator'],
                cost: 60000
            },
            'Electricity': {
                equipment: ['Bucket Truck', 'Testing Equipment', 'Replacement Transformers'],
                vehicles: ['Utility Truck with Crane', 'Service Vehicle'],
                cost: 75000
            },
            'Bridge': {
                equipment: ['Crane', 'Scaffolding', 'Diagnostic Equipment'],
                vehicles: ['Mobile Crane', 'Support Vehicles'],
                cost: 100000
            }
        };

        const assetResources = equipmentMap[assetData.type] || {
            equipment: ['Standard Equipment Kit'],
            vehicles: ['Service Vehicle'],
            cost: 25000
        };

        resources.heavy_equipment = assetResources.equipment;
        resources.vehicles = assetResources.vehicles;
        resources.estimated_cost = assetResources.cost * (failureType === 'Complete Failure' ? 1.5 : 1);

        return resources;
    }

    /**
     * Generate communication plan
     */
    async generateCommunicationPlan(assetData) {
        const plan = {
            immediate: [
                `T+0: Alert ${assetData.type} emergency team`,
                'T+5: Notify Department Head',
                'T+10: Activate contractor team',
                'T+15: Brief communications team'
            ],
            during: [
                'Every 15 minutes: Status update to command center',
                'Every 30 minutes: Public communication update (if needed)',
                'Continuous: Safety team coordination'
            ],
            public_notification: this.getPublicNotification(assetData.type),
            stakeholders: this.getStakeholders(assetData.type)
        };

        return plan;
    }

    /**
     * Get public notification template
     */
    getPublicNotification(assetType) {
        const notifications = {
            'Water Pipeline': 'ALERT: Water supply disruption expected. Estimated restoration: [TIME]. Updates at [FREQUENCY]',
            'Sewage': 'ALERT: Sewage emergency in area. Please avoid affected zones. Updates at [FREQUENCY]',
            'Electricity': 'ALERT: Power outage in sector. Emergency response active. Estimated restoration: [TIME]',
            'Road': 'ALERT: Road closure on [ROAD NAME]. Alternate routes recommended. Estimated reopening: [TIME]',
            'Bridge': 'ALERT: Bridge temporarily closed for emergency inspection. Updates at [FREQUENCY]'
        };

        return notifications[assetType] || 'ALERT: Emergency maintenance in progress. Updates at hourly intervals.';
    }

    /**
     * Get key stakeholders for notification
     */
    getStakeholders(assetType) {
        const stakeholders = {
            'Water Pipeline': ['Water Supply Department', 'Public Health', 'Hospitals', 'Media'],
            'Sewage': ['Sanitation Department', 'Health Authority', 'Environmental Agency'],
            'Electricity': ['Power Distribution Company', 'Hospitals', 'Emergency Services', 'Media'],
            'Road': ['Traffic Police', 'Public Transport', 'Emergency Services', 'Media'],
            'Bridge': ['Transportation Authority', 'Traffic Police', 'Emergency Services']
        };

        return stakeholders[assetType] || ['Relevant Departments', 'Media'];
    }

    /**
     * Generate alternative actions
     */
    async generateAlternativeActions(assetData, failureType) {
        const alternatives = [];

        if (assetData.type === 'Water Pipeline') {
            alternatives.push({
                action: 'Activate backup water supply line',
                timeNeeded: '15 minutes',
                effectiveness: 'Partial - 70% normal supply'
            });
            alternatives.push({
                action: 'Deploy water tankers to affected areas',
                timeNeeded: '30 minutes',
                effectiveness: 'Temporary - emergency supply only'
            });
            alternatives.push({
                action: 'Activate alternative source (bore wells)',
                timeNeeded: '45 minutes',
                effectiveness: 'Partial - local areas only'
            });
        }

        if (assetData.type === 'Electricity') {
            alternatives.push({
                action: 'Switch to backup power grid',
                timeNeeded: '5 minutes',
                effectiveness: 'Full - immediate restoration'
            });
            alternatives.push({
                action: 'Deploy temporary generators',
                timeNeeded: '30 minutes',
                effectiveness: 'Partial - critical loads only'
            });
        }

        if (assetData.type === 'Road') {
            alternatives.push({
                action: 'Activate alternate route via [ROUTE]',
                timeNeeded: 'Immediate',
                effectiveness: 'Partial - adds 15 min travel time'
            });
            alternatives.push({
                action: 'Deploy rapid patching crew',
                timeNeeded: '15 minutes',
                effectiveness: 'Temporary - allows through traffic'
            });
        }

        return alternatives.length > 0 ? alternatives : [{
            action: 'Continue standard emergency repair',
            timeNeeded: 'As per plan',
            effectiveness: 'Full restoration'
        }];
    }

    /**
     * Get emergency hotline and escalation info
     */
    getEmergencyHotlineInfo() {
        return {
            centralHotline: '1999',
            departments: {
                water: '1919',
                sewage: '1921',
                electricity: '1912',
                roads: '1913',
                emergency: '911'
            },
            escalationPath: [
                'Field Officer',
                'Department Coordinator (15 min)',
                'Department Head (30 min)',
                'Mayor/Administrator (1 hour)'
            ]
        };
    }

    /**
     * Track active emergency response
     */
    async trackEmergencyResponse(emergencyId, status) {
        try {
            // In a real system, store in database
            const statusMap = {
                'INITIATED': 'Emergency response initiated',
                'TEAM_ASSEMBLED': 'Response team assembled and departing',
                'TRAVELING': 'Emergency team in transit',
                'ON_SITE': 'Team arrived on site',
                'ASSESSMENT': 'Assessing damage and situation',
                'REPAIR_STARTED': 'Repair work commenced',
                'REPAIR_COMPLETE': 'Repair completed',
                'CONTAINED': 'Emergency contained and services restored',
                'CLOSED': 'Emergency response closed'
            };

            return {
                emergencyId,
                status,
                statusDescription: statusMap[status],
                timestamp: new Date(),
                nextUpdate: new Date(Date.now() + 15 * 60000) // 15 minutes
            };
        } catch (error) {
            console.error('Emergency tracking error:', error);
            return null;
        }
    }
}

module.exports = new EmergencyResponseService();
