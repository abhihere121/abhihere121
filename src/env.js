function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

function getEnv() {
  const defaultScopes = ["read_products", "read_inventory", "write_script_tags", "write_webhooks"].join(",");
  const scopeList = String(process.env.SHOPIFY_SCOPES || defaultScopes)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const minimal = new Set(["read_products", "read_inventory", "write_script_tags", "write_webhooks"]);
  const hasMinimal = Array.from(minimal).every(s => scopeList.includes(s));
  const allowExtraScopes = String(process.env.ALLOW_EXTRA_SHOPIFY_SCOPES || "").toLowerCase() === "true";

  return {
    databaseUrl: process.env.DATABASE_URL || "",
    appUrl: process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "",
    shopifyApiKey: process.env.SHOPIFY_API_KEY || "",
    shopifyApiSecret: process.env.SHOPIFY_API_SECRET || "",
    shopifyScopes: allowExtraScopes && hasMinimal ? scopeList.join(",") : defaultScopes,
    encryptionKey: process.env.APP_ENCRYPTION_KEY || "",
    embeddedSigSecret: process.env.EMBED_SIG_SECRET || "",
    allowDevSeed: String(process.env.ALLOW_DEV_SEED || "").toLowerCase() === "true"
  };
}

module.exports = { getEnv, requireEnv };
