const pool = require('../config/db');

/**
 * Create Maintenance Record
 */
exports.createMaintenance = async (req, res) => {
    try {
        const { asset_id, maintenance_type, description, performed_by, cost, maintenance_date, next_due_date, status } = req.body;

        const result = await pool.query(
            `INSERT INTO maintenance_schedule 
            (asset_id, maintenance_type, description, performed_by, cost, maintenance_date, next_due_date, status) 
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) 
            RETURNING *`,
            [asset_id, maintenance_type, description, performed_by, cost, maintenance_date, next_due_date, status || 'Scheduled']
        );

        res.status(201).json({
            message: "Maintenance record created successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Create Maintenance Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

/**
 * Get All Maintenance Records
 */
exports.getAllMaintenance = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, a.name AS asset_name 
            FROM maintenance_schedule m
            LEFT JOIN assets a ON m.asset_id = a.id
            ORDER BY m.id DESC
        `);

        res.json(result.rows);

    } catch (error) {
        console.error("Get Maintenance Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

/**
 * Get Maintenance By ID
 */
exports.getMaintenanceById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT * FROM maintenance_schedule WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Maintenance record not found" });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("Get Maintenance By ID Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

/**
 * Update Maintenance Record
 */
exports.updateMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const { maintenance_type, description, performed_by, cost, maintenance_date, next_due_date, status } = req.body;

        const result = await pool.query(
            `UPDATE maintenance_schedule
             SET maintenance_type=COALESCE($1, maintenance_type),
                 description=COALESCE($2, description),
                 performed_by=COALESCE($3, performed_by),
                 cost=COALESCE($4, cost),
                 maintenance_date=COALESCE($5, maintenance_date),
                 next_due_date=COALESCE($6, next_due_date),
                 status=COALESCE($7, status)
             WHERE id=$8
             RETURNING *`,
            [maintenance_type, description, performed_by, cost, maintenance_date, next_due_date, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Maintenance record not found" });
        }

        res.json({
            message: "Maintenance updated successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Update Maintenance Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

/**
 * Delete Maintenance Record
 */
exports.deleteMaintenance = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM maintenance_schedule WHERE id=$1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Maintenance record not found" });
        }

        res.json({ message: "Maintenance deleted successfully" });

    } catch (error) {
        console.error("Delete Maintenance Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};