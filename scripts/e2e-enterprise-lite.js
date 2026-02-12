require("dotenv").config();
try {
  require("dns").setDefaultResultOrder?.("ipv4first");
} catch {}

async function getText(url) {
  const res = await fetch(url);
  const text = await res.text();
  return { status: res.status, text };
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function ok(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${msg}`);
  }
}

async function main() {
  const base = process.env.SIZESIGNAL_BASE_URL || "http://localhost:3001";
  const shop = "demo-store.myshopify.com";

  const embed = await getText(`${base}/embed/sizesignal.js?shop=${encodeURIComponent(shop)}`);
  ok(embed.status === 200, "embed script served");
  ok(embed.text.includes("event_id"), "embed includes event_id field");

  const eventId = `test_${Date.now()}`;
  const resp = await postJson(`${base}/api/demand-event`, {
    shop,
    event_id: eventId,
    event: "oos_visit",
    timestamp: new Date().toISOString(),
    page_url: `${base}/`,
    product_id: "123456789",
    product_handle: "red-floral-kurta",
    product_title: "Red Floral Kurta",
    variant_id: "4002",
    size_option: "M",
    available: false,
    price_paise: 149900,
    user_agent: "e2e-enterprise-lite"
  });
  ok(resp.status === 200, "/api/demand-event accepts payload");
  ok(resp.json.ok === true, "/api/demand-event returns ok:true");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
