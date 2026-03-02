const pool = require('../config/db');

const COST_LIMITS = {
    'Road': 500000,
    'Bridge': 500000,
    'Water Supply': 300000,
    'Electricity': 200000,
    'Sewage': 300000,
    'Street Light': 50000,
    'Park': 100000,
    'Building': 400000
};

// Create complaint (Citizen, Officer, Admin)
exports.createComplaint = async (req, res) => {
    try {
        const { title, description, asset_type, latitude, longitude } = req.body;
        const user_id = req.user.id;

        // Optional: validate required fields here

        const result = await pool.query(
            `INSERT INTO complaints 
            (title, description, asset_type, user_id, latitude, longitude, status, progress, approval_status)
            VALUES ($1, $2, $3, $4, $5, $6, 'Open', 0, 'Pending')
            RETURNING *`,
            [title, description, asset_type, user_id, latitude, longitude]
        );

        res.status(201).json({
            message: 'Complaint registered successfully',
            complaint: result.rows[0]
        });
    } catch (error) {
        console.error('Create Complaint Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Officer or Admin can submit estimate
exports.officerEstimate = async (req, res) => {
    try {
        const { id } = req.params;
        const { estimated_cost, assigned_agency } = req.body;

        const result = await pool.query(
            `UPDATE complaints
            SET estimated_cost = $1,
                assigned_agency = $2,
                status = 'In Progress'
            WHERE id = $3
            RETURNING *`,
            [estimated_cost, assigned_agency, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        res.json({
            message: 'Estimate submitted',
            complaint: result.rows[0]
        });
    } catch (error) {
        console.error('Officer Estimate Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Admin approves complaint estimate
exports.adminApprove = async (req, res) => {
    try {
        const { id } = req.params;
        const { approved_cost, assigned_agency } = req.body;
        const admin_id = req.user.id;

        // Check complaint exists and get asset_type
        const complaintRes = await pool.query('SELECT asset_type FROM complaints WHERE id = $1', [id]);
        if (complaintRes.rows.length === 0) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        const assetType = complaintRes.rows[0].asset_type;
        const maxCost = COST_LIMITS[assetType] || 500000;

        if (approved_cost > maxCost) {
            return res.status(400).json({ 
                message: `Cost exceeds limit of Rs ${maxCost} for ${assetType}` 
            });
        }

        // Update complaint approval details
        const result = await pool.query(
            `UPDATE complaints
            SET approved_cost = $1,
                assigned_agency = $2,
                approved_by = $3,
                approval_status = 'Approved'
            WHERE id = $4
            RETURNING *`,
            [approved_cost, assigned_agency, admin_id, id]
        );

        // Insert into maintenance_schedule (with NULL asset_id as per your schema)
        await pool.query(
            `INSERT INTO maintenance_schedule 
            (asset_id, maintenance_type, performed_by, cost, status)
            VALUES (NULL, $1, $2, $3, 'Scheduled')`,
            [assetType, assigned_agency, approved_cost]
        );

        res.json({
            message: 'Complaint approved',
            complaint: result.rows[0]
        });
    } catch (error) {
        console.error('Admin Approve Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Admin closes complaint
exports.adminClose = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution_notes, sla_hours } = req.body;

        const result = await pool.query(
            `UPDATE complaints
            SET status = 'Closed',
                progress = 100,
                resolution_notes = $1,
                resolved_at = NOW()
            WHERE id = $2
            RETURNING *`,
            [resolution_notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        await pool.query(
            `UPDATE maintenance_schedule
            SET status = 'Completed'
            WHERE performed_by = $1 AND status != 'Completed'`,
            [result.rows[0].assigned_agency]
        );

        if (sla_hours) {
            const hoursElapsed = (new Date() - new Date(result.rows[0].created_at)) / (1000 * 60 * 60);
            const slaStatus = hoursElapsed > parseInt(sla_hours) ? 'Breached' : 'Closed';
            
            await pool.query(
                `INSERT INTO sla_tracking 
                (asset_id, issue_reported_at, issue_resolved_at, sla_hours, status)
                VALUES (NULL, $1, NOW(), $2, $3)`,
                [result.rows[0].created_at, parseInt(sla_hours), slaStatus]
            );
        }

        res.json({
            message: 'Complaint closed',
            complaint: result.rows[0]
        });
    } catch (error) {
        console.error('Admin Close Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Get all complaints (any authenticated user)
exports.getAllComplaints = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, 
                   u.name as user_name,
                   a.name as admin_name
            FROM complaints c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN users a ON c.approved_by = a.id
            ORDER BY c.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Get Complaints Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Get complaint by ID
exports.getComplaintById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT c.*, 
                    u.name as user_name,
                    a.name as admin_name
            FROM complaints c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN users a ON c.approved_by = a.id
            WHERE c.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get Complaint Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Update complaint progress (Admin and Officer only)
exports.updateProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { progress } = req.body;

        const result = await pool.query(
            `UPDATE complaints
            SET progress = $1
            WHERE id = $2
            RETURNING *`,
            [progress, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        res.json({
            message: 'Progress updated',
            complaint: result.rows[0]
        });
    } catch (error) {
        console.error('Update Progress Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Delete complaint (Admin only)
exports.deleteComplaint = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM complaints WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        res.json({ message: 'Complaint deleted' });
    } catch (error) {
        console.error('Delete Complaint Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};