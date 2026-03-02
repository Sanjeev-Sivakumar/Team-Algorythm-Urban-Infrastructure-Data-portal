const pool = require('../config/db');
const { generateCSV } = require('../utils/csvGenerator');
const { generateDashboardPDF } = require('../utils/pdfGenerator');
const axios = require('axios');

function getDistrict(lat, lon) {
    if (!lat || !lon) return 'No Location';
    
    const districts = [
        { name: 'Madurai Central', lat: 9.9252, lon: 78.1198, radius: 0.05 },
        { name: 'Madurai North', lat: 9.9500, lon: 78.1300, radius: 0.05 },
        { name: 'Madurai South', lat: 9.9000, lon: 78.1100, radius: 0.05 },
        { name: 'Madurai East', lat: 9.9200, lon: 78.1500, radius: 0.05 },
        { name: 'Madurai West', lat: 9.9300, lon: 78.0900, radius: 0.05 }
    ];
    
    for (let district of districts) {
        const distance = Math.sqrt(Math.pow(lat - district.lat, 2) + Math.pow(lon - district.lon, 2));
        if (distance < district.radius) {
            return district.name;
        }
    }
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

exports.exportAssetsCSV = async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, name, type, department, status, ST_Y(geometry) as latitude, ST_X(geometry) as longitude FROM assets`);
        const rows = result.rows.map(row => {
            const location = getDistrict(parseFloat(row.latitude), parseFloat(row.longitude));
            return {
                id: row.id,
                name: row.name,
                type: row.type,
                department: row.department,
                status: row.status,
                latitude: row.latitude,
                longitude: row.longitude,
                location: location
            };
        });
        const csv = generateCSV(rows);
        res.header('Content-Type', 'text/csv');
        res.attachment('assets_report.csv');
        return res.send(csv);
    } catch (error) {
        console.error("Export Assets CSV Error:", error);
        res.status(500).json({ error: "Server Error", details: error.message });
    }
};

exports.exportComplaintsCSV = async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, title, description, asset_type, latitude, longitude, status, progress FROM complaints`);
        const rows = result.rows.map(row => {
            const location = getDistrict(parseFloat(row.latitude), parseFloat(row.longitude));
            return {
                id: row.id,
                title: row.title,
                description: row.description,
                asset_type: row.asset_type,
                latitude: row.latitude,
                longitude: row.longitude,
                status: row.status,
                progress: row.progress,
                location: location
            };
        });
        const csv = generateCSV(rows);
        res.header('Content-Type', 'text/csv');
        res.attachment('complaints_report.csv');
        return res.send(csv);
    } catch (error) {
        console.error("Export Complaints CSV Error:", error);
        res.status(500).json({ error: "Server Error", details: error.message });
    }
};

exports.exportMaintenanceCSV = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM maintenance_schedule`);
        const csv = generateCSV(result.rows);
        res.header('Content-Type', 'text/csv');
        res.attachment('maintenance_report.csv');
        return res.send(csv);
    } catch (error) {
        console.error("Export Maintenance CSV Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

exports.exportAssetsPDF = async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, name, type, department, status, ST_Y(geometry) as latitude, ST_X(geometry) as longitude FROM assets`);
        const rows = result.rows.map(row => ({
            ...row,
            location: getDistrict(row.latitude, row.longitude)
        }));
        generateDashboardPDF({ title: 'Assets Report', data: rows }, res);
    } catch (error) {
        console.error("Export Assets PDF Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

exports.exportComplaintsPDF = async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, title, description, asset_type, latitude, longitude, status, progress FROM complaints`);
        const rows = result.rows.map(row => ({
            ...row,
            location: getDistrict(row.latitude, row.longitude)
        }));
        generateDashboardPDF({ title: 'Complaints Report', data: rows }, res);
    } catch (error) {
        console.error("Export Complaints PDF Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

exports.exportMaintenancePDF = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM maintenance_schedule`);
        generateDashboardPDF({ title: 'Maintenance Report', data: result.rows }, res);
    } catch (error) {
        console.error("Export Maintenance PDF Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

exports.exportDashboardPDF = async (req, res) => {
    try {
        const statsQuery = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM assets) AS total_assets,
                (SELECT COUNT(*) FROM assets WHERE status='Good') AS active_assets,
                (SELECT COUNT(*) FROM maintenance_schedule WHERE status='In Progress') AS under_maintenance_assets,
                (SELECT COUNT(*) FROM maintenance_schedule) AS total_maintenance_records,
                (SELECT COALESCE(SUM(cost),0) FROM maintenance_schedule) AS total_maintenance_cost
        `);
        const statusDistribution = await pool.query(`SELECT status, COUNT(*) FROM assets GROUP BY status`);
        const stats = { ...statsQuery.rows[0], status_distribution: statusDistribution.rows };
        generateDashboardPDF(stats, res);
    } catch (error) {
        console.error("Export Dashboard PDF Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};