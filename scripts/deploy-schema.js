require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { createPool } = require("../src/db");

async function deploy() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("❌ DATABASE_URL is not defined in .env");
        process.exit(1);
    }

    console.log("🔌 Connecting to database...");
    const pool = createPool(dbUrl);

    try {
        const schemaPath = path.join(__dirname, "../src/schema.sql");
        console.log(`📄 Reading schema from ${schemaPath}...`);
        const sql = fs.readFileSync(schemaPath, "utf8");

        console.log("🚀 Executing schema migration...");
        await pool.query(sql);

        console.log("✅ Schema deployed successfully!");
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

deploy();
