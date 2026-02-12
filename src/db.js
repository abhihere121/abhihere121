const { Pool } = require("pg");

function getPgConfig(databaseUrl) {
  if (!databaseUrl) return null;
  const url = new URL(databaseUrl);
  const sslmode = url.searchParams.get("sslmode");
  const needsSsl = sslmode === "require" || url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.com");
  if (url.searchParams.has("sslmode")) url.searchParams.delete("sslmode");
  if (url.searchParams.has("uselibpqcompat")) url.searchParams.delete("uselibpqcompat");
  const connectionString = url.toString();
  return {
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined
  };
}

function createPool(databaseUrl) {
  if (!databaseUrl) return null;
  const cfg = getPgConfig(databaseUrl);
  return new Pool(cfg);
}

module.exports = { createPool, getPgConfig };
