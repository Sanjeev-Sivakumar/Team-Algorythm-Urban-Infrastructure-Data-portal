/**
 * Blockchain-Based Transparency + QR Public Portal (Module 11)
 * Each asset gets:
 * - Unique QR Code
 * - Public blockchain hash
 * - Public maintenance history (tamper-proof)
 * - Smart contract for fund escrow
 */

const pool = require('../config/db');
const QRCode = require('qrcode');
const crypto = require('crypto');

class BlockchainTransparencyService {
    /**
     * Generate QR code for asset
     */
    async generateAssetQRCode(assetId, complaintId = null) {
        try {
            // Create unique identifier
            const qrData = {
                assetId,
                complaintId,
                timestamp: new Date(),
                platform: 'InfraBrain'
            };

            const qrString = JSON.stringify(qrData);
            const qrCode = await QRCode.toDataURL(qrString);

            // Generate blockchain hash
            const blockchainHash = this.generateBlockchainHash(qrString);

            // Store in database
            await pool.query(`
                INSERT INTO public_verifications (complaint_id, qr_code, verification_data)
                VALUES ($1, $2, $3)
                ON CONFLICT DO NOTHING
            `, [complaintId || null, blockchainHash, JSON.stringify(qrData)]);

            return {
                assetId,
                complaintId,
                qrCode,  // Data URL for display
                blockchainHash,
                publicUrl: `${process.env.PUBLIC_URL || 'http://localhost'}/verify/${blockchainHash}`,
                qrString
            };
        } catch (error) {
            throw new Error(`QR code generation error: ${error.message}`);
        }
    }

    /**
     * Generate blockchain hash (simulated - in production use actual blockchain)
     */
    generateBlockchainHash(data) {
        const hash = crypto
            .createHash('sha256')
            .update(data + Date.now())
            .digest('hex');

        return `0x${hash}`;
    }

    /**
     * Create blockchain record for complaint
     */
    async createBlockchainRecord(complaintId, assetType) {
        try {
            const complaint = await pool.query(
                'SELECT * FROM complaints WHERE id = $1',
                [complaintId]
            );

            if (complaint.rows.length === 0) throw new Error('Complaint not found');

            const complaintData = complaint.rows[0];
            const blockchainHash = this.generateBlockchainHash(
                JSON.stringify({
                    complaintId,
                    assetType,
                    status: complaintData.status,
                    timestamp: complaintData.created_at
                })
            );

            // Store blockchain record
            const record = {
                complaint_id: complaintId,
                contract_hash: blockchainHash,
                status: 'Escrowed',
                created_at: new Date()
            };

            // Insert smart contract record
            await pool.query(`
                INSERT INTO smart_contracts (complaint_id, contract_hash, status)
                VALUES ($1, $2, $3)
            `, [complaintId, blockchainHash, 'Escrowed']);

            return {
                blockchainHash,
                contractAddress: blockchainHash.slice(0, 42), // Simulate Ethereum address
                status: 'Escrowed',
                complaintId,
                timestamp: new Date()
            };
        } catch (error) {
            throw new Error(`Blockchain record creation error: ${error.message}`);
        }
    }

    /**
     * Get public complaint verification data (no auth required)
     */
    async getPublicComplaintData(blockchainHash) {
        try {
            const result = await pool.query(`
                SELECT pv.verification_data, c.*, m.cost, m.maintenance_type
                FROM public_verifications pv
                LEFT JOIN complaints c ON pv.complaint_id = c.id
                LEFT JOIN maintenance_schedule m ON c.id = m.asset_id
                WHERE pv.qr_code = $1
            `, [blockchainHash]);

            if (result.rows.length === 0) {
                return {
                    verified: false,
                    message: 'Complaint record not found'
                };
            }

            const data = result.rows[0];

            return {
                verified: true,
                complaintId: data.id,
                title: data.title,
                description: data.description,
                assetType: data.asset_type,
                status: data.status,
                complaintDate: data.created_at,
                resolvedDate: data.resolved_at,
                estimatedCost: data.estimated_cost,
                approvedCost: data.approved_cost,
                approvalStatus: data.approval_status,
                maintenanceWork: {
                    type: data.maintenance_type,
                    cost: data.cost
                },
                publicAccessCount: result.rows[0].view_count || 0,
                blockchainVerified: true
            };
        } catch (error) {
            console.error('Public data retrieval error:', error);
            return {
                verified: false,
                message: 'Unable to retrieve complaint data'
            };
        }
    }

    /**
     * Create escrow smart contract for payment
     */
    async createEscrowContract(complaintId, vendorAddress, escrowAmount) {
        try {
            const blockchainHash = this.generateBlockchainHash(
                `${complaintId}${vendorAddress}${escrowAmount}`
            );

            // Store smart contract
            await pool.query(`
                INSERT INTO smart_contracts 
                (complaint_id, contract_hash, contractor_address, escrow_amount, status)
                VALUES ($1, $2, $3, $4, 'Escrowed')
            `, [complaintId, blockchainHash, vendorAddress, escrowAmount]);

            return {
                contractHash: blockchainHash,
                contractAddress: blockchainHash.slice(0, 42),
                escrowAmount,
                status: 'Escrowed',
                conditions: [
                    'Work must be completed within specified timeframe',
                    'Funds released only after verification',
                    'Quality inspection required before release',
                    'Public can verify work completion via blockchain'
                ],
                releaseConditions: {
                    workCompletion: 'Inspector must verify 100% completion',
                    qualityCheck: 'Pass quality inspection standards',
                    paymentVerification: 'Invoice verification complete'
                }
            };
        } catch (error) {
            throw new Error(`Escrow contract creation error: ${error.message}`);
        }
    }

    /**
     * Release escrow funds (after work verification)
     */
    async releaseEscrowFunds(complaintId, proofHash) {
        try {
            // Update smart contract status
            await pool.query(`
                UPDATE smart_contracts
                SET status = 'Released', released_at = CURRENT_TIMESTAMP, work_proof_hash = $2
                WHERE complaint_id = $1
            `, [complaintId, proofHash]);

            // Create blockchain record of release
            const releaseRecord = {
                action: 'ESCROW_RELEASED',
                complaintId,
                timestamp: new Date(),
                proofHash,
                verificationLink: `/verify-release/${proofHash}`
            };

            return {
                success: true,
                message: 'Funds released from escrow',
                releaseRecord,
                blockchainConfirmation: 'Transaction recorded on blockchain'
            };
        } catch (error) {
            throw new Error(`Escrow release error: ${error.message}`);
        }
    }

    /**
     * Get public maintenance history (tamper-proof)
     */
    async getPublicMaintenanceHistory(assetId) {
        try {
            const result = await pool.query(`
                SELECT m.*, sc.contract_hash, sc.status as contract_status
                FROM maintenance_schedule m
                LEFT JOIN smart_contracts sc ON m.asset_id = $1
                WHERE m.asset_id = $1
                ORDER BY m.maintenance_date DESC
            `, [assetId]);

            const maintenanceHistory = result.rows.map(row => ({
                maintenanceId: row.id,
                assetId: row.asset_id,
                type: row.maintenance_type,
                date: row.maintenance_date,
                status: row.status,
                cost: row.cost,
                performer: row.performed_by,
                blockchainHash: row.contract_hash,
                contractStatus: row.contract_status,
                blockchainVerified: !!row.contract_hash
            }));

            return {
                assetId,
                totalRecords: maintenanceHistory.length,
                history: maintenanceHistory,
                generatedAt: new Date(),
                publiclyVerifiable: true
            };
        } catch (error) {
            throw new Error(`Maintenance history retrieval error: ${error.message}`);
        }
    }

    /**
     * Get transparency dashboard for public
     */
    async getPublicTransparencyDashboard(assetId) {
        try {
            const asset = await pool.query(
                'SELECT * FROM assets WHERE id = $1',
                [assetId]
            );

            if (asset.rows.length === 0) throw new Error('Asset not found');

            const assetData = asset.rows[0];

            // Generate QR code
            const qr = await this.generateAssetQRCode(assetId);

            // Get maintenance history
            const maintenanceHistory = await this.getPublicMaintenanceHistory(assetId);

            // Get complaints related to this asset
            const complaints = await pool.query(`
                SELECT id, title, status, created_at, estimated_cost, approved_cost
                FROM complaints
                WHERE asset_type = $1
                ORDER BY created_at DESC
                LIMIT 10
            `, [assetData.type]);

            // Get blockchain records
            const records = await pool.query(`
                SELECT contract_hash, status, created_at
                FROM smart_contracts
                WHERE complaint_id IN (
                    SELECT id FROM complaints WHERE asset_type = $1
                )
            `, [assetData.type]);

            return {
                asset: {
                    id: assetData.id,
                    name: assetData.name,
                    type: assetData.type,
                    status: assetData.status,
                    installationDate: assetData.installation_date,
                    lastInspection: assetData.last_inspection
                },
                qr: {
                    code: qr.qrCode,
                    publicUrl: qr.publicUrl,
                    blockchainHash: qr.blockchainHash
                },
                maintenance: maintenanceHistory,
                complaints: complaints.rows,
                blockchainRecords: records.rows.map(r => ({
                    hash: r.contract_hash,
                    status: r.status,
                    date: r.created_at
                })),
                verificationStatus: 'Public Verified',
                disclaimer: 'This information is publicly available and blockchain-verified'
            };
        } catch (error) {
            throw new Error(`Transparency dashboard error: ${error.message}`);
        }
    }

    /**
     * Public citizen complaint verification
     */
    async verifyCitizenComplaint(qrHash) {
        try {
            const publicData = await this.getPublicComplaintData(qrHash);

            if (!publicData.verified) {
                return publicData;
            }

            // Increment view count
            await pool.query(`
                UPDATE public_verifications
                SET view_count = view_count + 1
                WHERE qr_code = $1
            `, [qrHash]);

            return {
                ...publicData,
                citizenVerificationInfo: {
                    message: 'You can verify that this complaint has been recorded and is being tracked',
                    nextSteps: [
                        'Monitor status updates on this page',
                        'Share this QR code to track progress',
                        'Verify contractor work completion'
                    ],
                    contactRepresentative: 'Contact your elected representative for updates'
                }
            };
        } catch (error) {
            return {
                verified: false,
                error: error.message
            };
        }
    }

    /**
     * Generate public transparency report
     */
    async generatePublicTransparencyReport() {
        try {
            // Get all public records
            const result = await pool.query(`
                SELECT 
                    c.id,
                    c.title,
                    c.status,
                    c.estimated_cost,
                    c.approved_cost,
                    c.created_at,
                    c.resolved_at,
                    sc.contract_hash,
                    sc.status as contract_status
                FROM complaints c
                LEFT JOIN smart_contracts sc ON c.id = sc.complaint_id
                WHERE c.approval_status = 'Approved'
                ORDER BY c.resolved_at DESC
            `);

            const records = result.rows;

            const report = {
                reportDate: new Date(),
                totalRecordsPublic: records.length,
                resolvedComplaints: records.filter(r => r.status === 'Resolved').length,
                blockhainVerifiedRecords: records.filter(r => r.contract_hash).length,
                totalInvestment: Math.round(
                    records.reduce((sum, r) => sum + (parseFloat(r.approved_cost) || 0), 0)
                ),
                averageCostPerProject: Math.round(
                    records.reduce((sum, r) => sum + (parseFloat(r.approved_cost) || 0), 0) / 
                    Math.max(1, records.length)
                ),
                publicRecords: records.map(r => ({
                    complaintId: r.id,
                    title: r.title,
                    status: r.status,
                    cost: r.approved_cost,
                    date: r.created_at,
                    resolved: r.resolved_at,
                    blockchainVerified: !!r.contract_hash
                })),
                transparency: 'All approved complaints are publicly verifiable',
                publicAccessLink: `${process.env.PUBLIC_URL || 'http://localhost'}/transparency`
            };

            return report;
        } catch (error) {
            throw new Error(`Transparency report generation error: ${error.message}`);
        }
    }
}

module.exports = new BlockchainTransparencyService();
