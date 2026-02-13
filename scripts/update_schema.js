const { createPool } = require('../src/db');
require('dotenv').config();

async function migrate() {
    const pool = createPool(process.env.DATABASE_URL);
    try {
        console.log("Adding image_url column to products...");
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;");
        console.log("Successfully updated schema.");
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
