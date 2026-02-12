const { hmacHex, hmacBase64 } = require("../src/crypto");
const shopify = require("../src/shopify");

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${msg}`);
  }
}

function testOauthHmac() {
  const apiSecret = "shpss_test_secret";
  const query = {
    code: "abc",
    shop: "demo-store.myshopify.com",
    state: "state123",
    timestamp: "1700000000"
  };
  const msg = Object.keys(query)
    .sort()
    .map(k => `${k}=${query[k]}`)
    .join("&");
  const hmac = hmacHex(apiSecret, msg);
  const ok = shopify.verifyOauthHmac({ query: { ...query, hmac }, apiSecret });
  assert(ok, "oauth hmac verify");
}

function testWebhookHmac() {
  const apiSecret = "shpss_test_secret";
  const raw = Buffer.from(JSON.stringify({ hello: "world" }), "utf8");
  const header = hmacBase64(apiSecret, raw);
  const ok = shopify.verifyWebhookHmac({ apiSecret, rawBody: raw, headerHmac: header });
  assert(ok, "webhook hmac verify");
}

function testEmbedSig() {
  const embeddedSigSecret = "embed_secret";
  const shop = "demo-store.myshopify.com";
  const sig = shopify.signEmbed({ shop, embeddedSigSecret });
  const ok = shopify.verifyEmbedSig({ shop, sig, embeddedSigSecret });
  assert(ok, "embed sig verify");
}

testOauthHmac();
testWebhookHmac();
testEmbedSig();

