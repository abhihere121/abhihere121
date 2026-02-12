require("dotenv").config();
try {
  require("dns").setDefaultResultOrder?.("ipv4first");
} catch {}

const fs = require("fs");
const path = require("path");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const { Client } = require("pg");
  const { getPgConfig } = require("../src/db");
  const client = new Client(getPgConfig(databaseUrl));
  await client.connect();

  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
    );

    const migrationsDir = path.join(__dirname, "..", "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => /^\d+_.+\.sql$/i.test(f))
      .sort();

    for (const file of files) {
      const already = await client.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
      if (already.rowCount) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`applied ${file}`);
    }

    console.log("done");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
