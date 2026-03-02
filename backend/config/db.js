const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'urban_infra',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

pool.connect()
    .then(() => console.log("✅ PostgreSQL Connected Successfully"))
    .catch(err => console.error("❌ Database Connection Error:", err));

module.exports = pool;