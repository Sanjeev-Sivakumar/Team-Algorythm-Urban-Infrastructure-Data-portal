const pool = require('../config/db');

/**
 * Create SLA Record
 */
exports.createSLA = async (req, res) => {
    try {
        const { asset_id, sla_hours, status } = req.body;

        const result = await pool.query(
            `INSERT INTO sla_tracking 
            (asset_id, sla_hours, status) 
            VALUES ($1, $2, $3)
            RETURNING *`,
            [asset_id, sla_hours, status || 'Open']
        );

        res.status(201).json({
            message: "SLA record created successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Create SLA Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

/**
 * Get All SLA Records
 */
exports.getAllSLA = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.*, a.name AS asset_name
            FROM sla_tracking s
            JOIN assets a ON s.asset_id = a.id
            ORDER BY s.issue_reported_at DESC
        `);

        res.json(result.rows);

    } catch (error) {
        console.error("Get SLA Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

/**
 * Update SLA (resolve or change status)
 */
exports.updateSLA = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, issue_resolved_at } = req.body;

        const result = await pool.query(
            `UPDATE sla_tracking
             SET status=$1,
                 issue_resolved_at=$2
             WHERE id=$3
             RETURNING *`,
            [status, issue_resolved_at, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "SLA record not found" });
        }

        res.json({
            message: "SLA updated successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Update SLA Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

/**
 * Get SLA Breaches
 */
exports.getBreachedSLAs = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM sla_tracking
             WHERE status='Open'
             AND issue_reported_at + (sla_hours || ' hours')::interval < NOW()`
        );

        res.json(result.rows);

    } catch (error) {
        console.error("SLA Breach Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};