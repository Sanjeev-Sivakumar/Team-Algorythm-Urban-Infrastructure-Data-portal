const crypto = require('crypto');
const pool = require('../config/db');

const createSmartContract = async (complaintId, contractorAddress, escrowAmount) => {
    const contractHash = '0x' + crypto.randomBytes(32).toString('hex');
    
    const result = await pool.query(
        `INSERT INTO smart_contracts (complaint_id, contract_hash, contractor_address, escrow_amount, status)
         VALUES ($1, $2, $3, $4, 'Escrowed') RETURNING *`,
        [complaintId, contractHash, contractorAddress, escrowAmount]
    );
    
    return result.rows[0];
};

const verifyWorkProof = async (contractId, workProofHash) => {
    const result = await pool.query(
        `UPDATE smart_contracts SET work_proof_hash = $1 WHERE id = $2 RETURNING *`,
        [workProofHash, contractId]
    );
    
    return result.rows[0];
};

const releasePayment = async (contractId) => {
    const result = await pool.query(
        `UPDATE smart_contracts SET status = 'Released', released_at = CURRENT_TIMESTAMP 
         WHERE id = $1 AND work_proof_hash IS NOT NULL RETURNING *`,
        [contractId]
    );
    
    if (result.rows.length === 0) {
        throw new Error('Cannot release payment without work proof');
    }
    
    return result.rows[0];
};

const getContractStatus = async (complaintId) => {
    const result = await pool.query(
        `SELECT * FROM smart_contracts WHERE complaint_id = $1`,
        [complaintId]
    );
    
    return result.rows[0];
};

module.exports = { createSmartContract, verifyWorkProof, releasePayment, getContractStatus };
