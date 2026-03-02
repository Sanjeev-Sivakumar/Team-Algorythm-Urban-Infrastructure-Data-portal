const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // your DB pool
const JWT_SECRET = process.env.JWT_SECRET || "urban_secret_key";

module.exports = async function (req, res, next) {
    try {
        const authHeader = req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Access Denied: No token provided" });
        }

        const token = authHeader.replace("Bearer ", "").trim();

        const verified = jwt.verify(token, JWT_SECRET);

        // Verify user exists in DB
        const userCheck = await pool.query(
            'SELECT id, role FROM users WHERE id = $1',
            [verified.id]
        );

        if (userCheck.rows.length === 0) {
            return res.status(401).json({ message: "Invalid token: user does not exist" });
        }

        // Attach user info to request
        req.user = userCheck.rows[0];

        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};