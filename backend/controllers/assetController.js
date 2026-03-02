const pool = require('../config/db');

exports.createAsset = async (req, res) => {
    try {
        const { name, type, department, status, lifecycle_stage, installation_date, last_inspection, geometry, location } = req.body;
        const geomData = location || geometry;

        if (!name || !type || !geomData) {
            return res.status(400).json({ message: "Name, Type and Geometry/Location are required" });
        }

        const query = `INSERT INTO assets (name, type, department, status, lifecycle_stage, installation_date, last_inspection, geometry)
            VALUES ($1,$2,$3,$4,$5,$6,$7, ST_SetSRID(ST_GeomFromGeoJSON($8),4326)) RETURNING *;`;

        let dbStatus = status;
        if (status === 'Active') dbStatus = 'Good';
        else if (status === 'Inactive') dbStatus = 'Critical';
        dbStatus = dbStatus || 'Good';

        const values = [name, type, department || null, dbStatus, lifecycle_stage || 'Active', installation_date || null, last_inspection || null, JSON.stringify(geomData)];
        const result = await pool.query(query, values);

        res.status(201).json({ message: "Asset created successfully", asset: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.getAssets = async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, name, type, department, status, lifecycle_stage, installation_date, last_inspection, ST_AsGeoJSON(geometry)::json AS location, created_at FROM assets ORDER BY id DESC;`);
        const rows = result.rows.map(r => {
            let status = r.status;
            if (status === 'Good') status = 'Active';
            else if (status === 'Critical') status = 'Inactive';
            return { ...r, status };
        });
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.getAssetById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`SELECT id, name, type, department, status, lifecycle_stage, installation_date, last_inspection, ST_AsGeoJSON(geometry)::json AS location, created_at FROM assets WHERE id = $1;`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Asset not found" });
        }
        const asset = result.rows[0];
        if (asset.status === 'Good') asset.status = 'Active';
        else if (asset.status === 'Critical') asset.status = 'Inactive';
        res.json(asset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, department, status, lifecycle_stage, last_inspection, location } = req.body;
        
        let updateFields = [];
        let values = [];
        let paramCount = 1;
        
        if (name) {
            updateFields.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (type) {
            updateFields.push(`type = $${paramCount++}`);
            values.push(type);
        }
        if (department) {
            updateFields.push(`department = $${paramCount++}`);
            values.push(department);
        }
        if (status) {
            let dbStatus = status;
            if (status === 'Active') dbStatus = 'Good';
            else if (status === 'Inactive') dbStatus = 'Critical';
            updateFields.push(`status = $${paramCount++}`);
            values.push(dbStatus);
        }
        if (lifecycle_stage) {
            updateFields.push(`lifecycle_stage = $${paramCount++}`);
            values.push(lifecycle_stage);
        }
        if (last_inspection) {
            updateFields.push(`last_inspection = $${paramCount++}`);
            values.push(last_inspection);
        }
        if (location) {
            updateFields.push(`geometry = ST_SetSRID(ST_GeomFromGeoJSON($${paramCount++}),4326)`);
            values.push(JSON.stringify(location));
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }
        
        values.push(id);
        const query = `UPDATE assets SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *;`;
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Asset not found" });
        }
        res.json({ message: "Asset updated successfully", asset: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`DELETE FROM assets WHERE id = $1 RETURNING *;`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Asset not found" });
        }
        res.json({ message: "Asset deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};