const crypto = require('crypto');
const pool = require('../config/db');

const registerIoTDevice = async (assetId, deviceType) => {
    const deviceId = 'IOT-' + crypto.randomBytes(8).toString('hex');
    const encryptionKey = crypto.randomBytes(32).toString('hex');
    
    const result = await pool.query(
        `INSERT INTO iot_devices (asset_id, device_id, device_type, encryption_key, status)
         VALUES ($1, $2, $3, $4, 'Active') RETURNING *`,
        [assetId, deviceId, deviceType, encryptionKey]
    );
    
    return result.rows[0];
};

const detectAnomaly = (sensorData) => {
    const { reading_value, sensor_type } = sensorData;
    
    const thresholds = {
        'Vibration': { min: 0, max: 5 },
        'Temperature': { min: -10, max: 60 },
        'Pressure': { min: 0, max: 10 },
        'Flow': { min: 0, max: 200 }
    };
    
    const threshold = thresholds[sensor_type] || { min: 0, max: 100 };
    const isAnomaly = reading_value < threshold.min || reading_value > threshold.max;
    
    return {
        anomalyDetected: isAnomaly,
        severity: isAnomaly ? 'High' : 'Normal',
        recommendation: isAnomaly ? 'Immediate inspection required' : 'Normal operation'
    };
};

const generateQRVerification = async (complaintId) => {
    const qrCode = 'QR-' + crypto.randomBytes(16).toString('hex');
    
    const complaint = await pool.query(
        `SELECT c.*, u.name as reported_by, sc.contract_hash, sc.contractor_address, sc.status as payment_status
         FROM complaints c 
         LEFT JOIN users u ON c.user_id = u.id
         LEFT JOIN smart_contracts sc ON c.id = sc.complaint_id
         WHERE c.id = $1`,
        [complaintId]
    );
    
    const verificationData = {
        complaintId: complaint.rows[0].id,
        title: complaint.rows[0].title,
        status: complaint.rows[0].status,
        reportedBy: complaint.rows[0].reported_by,
        agency: complaint.rows[0].assigned_agency,
        contractHash: complaint.rows[0].contract_hash,
        paymentStatus: complaint.rows[0].payment_status,
        verifiedAt: new Date().toISOString()
    };
    
    const result = await pool.query(
        `INSERT INTO public_verifications (complaint_id, qr_code, verification_data)
         VALUES ($1, $2, $3) RETURNING *`,
        [complaintId, qrCode, JSON.stringify(verificationData)]
    );
    
    return result.rows[0];
};

const verifyQRCode = async (qrCode) => {
    const result = await pool.query(
        `UPDATE public_verifications SET view_count = view_count + 1 
         WHERE qr_code = $1 RETURNING *`,
        [qrCode]
    );
    
    return result.rows[0];
};

module.exports = { registerIoTDevice, detectAnomaly, generateQRVerification, verifyQRCode };
