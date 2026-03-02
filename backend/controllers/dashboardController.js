const pool = require('../config/db');

/**
 * Get Dashboard Overview Statistics
 */
exports.getDashboardStats = async (req, res) => {
    try {

        // Total Assets
        const totalAssets = await pool.query(
            `SELECT COUNT(*) FROM assets`
        );

        // Active Assets (`Good` in DB maps to Active in frontend)
        const activeAssets = await pool.query(
            `SELECT COUNT(*) FROM assets WHERE status = 'Good'`
        );

        // Under Maintenance (count all active maintenance tasks)
        const maintenanceAssets = await pool.query(
            `SELECT COUNT(*) 
             FROM maintenance_schedule 
             WHERE status = 'In Progress' OR status = 'Scheduled'`
        );

        // Total Maintenance Records
        const totalMaintenance = await pool.query(
            `SELECT COUNT(*) FROM maintenance_schedule`
        );

        // Total Maintenance Cost
        const totalCost = await pool.query(
            `SELECT COALESCE(SUM(approved_cost),0) as total FROM complaints WHERE approval_status = 'Approved'`
        );

        // Asset Status Distribution - map db statuses to our labels
        const statusDistribution = await pool.query(
            `SELECT 
                 CASE
                     WHEN status = 'Good' THEN 'Active'
                     WHEN status = 'Critical' THEN 'Inactive'
                     ELSE status
                 END AS status_label,
                 COUNT(*)
             FROM assets 
             GROUP BY status_label`
        );

        res.json({
            total_assets: parseInt(totalAssets.rows[0].count),
            active_assets: parseInt(activeAssets.rows[0].count),
            under_maintenance_assets: parseInt(maintenanceAssets.rows[0].count),
            total_maintenance_records: parseInt(totalMaintenance.rows[0].count),
            total_maintenance_cost: parseFloat(totalCost.rows[0].total),
            status_distribution: statusDistribution.rows
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};