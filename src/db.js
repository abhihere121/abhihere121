const { Pool } = require("pg");

function getPgConfig(databaseUrl) {
  if (!databaseUrl) return null;
  const url = new URL(databaseUrl);
  // Supabase/Postgres specific SSL handling
  const sslmode = url.searchParams.get("sslmode");
  const needsSsl = sslmode === "require" || url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.com");

  // Clean up params that might confuse Pool
  if (url.searchParams.has("sslmode")) url.searchParams.delete("sslmode");
  if (url.searchParams.has("uselibpqcompat")) url.searchParams.delete("uselibpqcompat");

  const connectionString = url.toString();
  return {
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined
  };
}

function createPool(databaseUrl) {
  if (!databaseUrl) {
    console.warn("⚠️ No DATABASE_URL provided. Database features will be disabled.");
    return null;
  }
  const cfg = getPgConfig(databaseUrl);
  const pool = new Pool(cfg);

  // Test connection
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

module.exports = { createPool, getPgConfig };
