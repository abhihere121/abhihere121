const { hmacHex, hmacBase64, timingSafeEqualStr, encryptAes256Gcm, decryptAes256Gcm } = require("./crypto");

function normalizeShopDomain(shop) {
  const s = String(shop || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s)) return "";
  return s;
}

function buildAuthUrl({ shop, apiKey, scopes, redirectUri, state }) {
  const u = new URL(`https://${shop}/admin/oauth/authorize`);
  u.searchParams.set("client_id", apiKey);
  u.searchParams.set("scope", scopes);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  u.searchParams.set("grant_options[]", "per-user");
  return u.toString();
}

function verifyOauthHmac({ query, apiSecret }) {
  const { hmac, signature, ...rest } = query || {};
  const provided = String(hmac || signature || "");
  if (!provided) return false;
  const keys = Object.keys(rest).sort();
  const message = keys.map(k => `${k}=${Array.isArray(rest[k]) ? rest[k].join(",") : rest[k]}`).join("&");
  const computed = hmacHex(apiSecret, message);
  return timingSafeEqualStr(computed, provided);
}

async function exchangeAccessToken({ shop, apiKey, apiSecret, code }) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: apiKey, client_secret: apiSecret, code })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`token_exchange_failed:${res.status}:${text}`);
  }
  return res.json();
}

async function shopifyRest({ shop, accessToken, method, path, body }) {
  const url = `https://${shop}${path}`;
  const headers = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`shopify_api_failed:${res.status}:${text}`);
  return text ? JSON.parse(text) : {};
}

async function shopifyRestWithHeaders({ shop, accessToken, method, path, body }) {
  const url = `https://${shop}${path}`;
  const headers = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`shopify_api_failed:${res.status}:${text}`);
  const json = text ? JSON.parse(text) : {};
  return { json, headers: res.headers };
}

async function registerWebhook({ shop, accessToken, topic, address, apiVersion }) {
  return shopifyRest({
    shop,
    accessToken,
    method: "POST",
    path: `/admin/api/${apiVersion}/webhooks.json`,
    body: { webhook: { topic, address, format: "json" } }
  });
}

async function createScriptTag({ shop, accessToken, src, apiVersion }) {
  return shopifyRest({
    shop,
    accessToken,
    method: "POST",
    path: `/admin/api/${apiVersion}/script_tags.json`,
    body: { script_tag: { event: "onload", src } }
  });
}

function verifyWebhookHmac({ apiSecret, rawBody, headerHmac }) {
  const provided = String(headerHmac || "");
  if (!provided) return false;
  const computed = hmacBase64(apiSecret, rawBody);
  return timingSafeEqualStr(computed, provided);
}

function encryptAccessToken({ accessToken, encryptionKey }) {
  if (!encryptionKey) return `plain:${accessToken}`;
  return `enc:${encryptAes256Gcm(accessToken, encryptionKey)}`;
}

function decryptAccessToken({ accessTokenEnc, encryptionKey }) {
  const val = String(accessTokenEnc || "");
  if (val.startsWith("plain:")) return val.slice("plain:".length);
  if (val.startsWith("enc:")) return decryptAes256Gcm(val.slice("enc:".length), encryptionKey);
  return val;
}

function signEmbed({ shop, embeddedSigSecret }) {
  if (!embeddedSigSecret) return "";
  return hmacHex(embeddedSigSecret, shop);
}

function verifyEmbedSig({ shop, sig, embeddedSigSecret }) {
  if (!embeddedSigSecret) return false;
  return timingSafeEqualStr(hmacHex(embeddedSigSecret, shop), String(sig || ""));
}

module.exports = {
  normalizeShopDomain,
  buildAuthUrl,
  verifyOauthHmac,
  exchangeAccessToken,
  shopifyRest,
  shopifyRestWithHeaders,
  registerWebhook,
  createScriptTag,
  verifyWebhookHmac,
  encryptAccessToken,
  decryptAccessToken,
  signEmbed,
  verifyEmbedSig
};
