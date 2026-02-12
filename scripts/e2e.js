require("dotenv").config();
try {
  require("dns").setDefaultResultOrder?.("ipv4first");
} catch {}

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.SIZESIGNAL_BASE_URL || "http://localhost:3001";

function ok(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function postForm(url, formObj) {
  const form = new URLSearchParams(formObj);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
  return { status: res.status, location: res.headers.get("location") || "" };
}

async function getJson(url) {
  const res = await fetch(url);
  const json = await res.json();
  return { status: res.status, json };
}

async function main() {
  const now = new Date();
  const from = new Date(now.valueOf() - 7 * 86400000).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);

  const oos = await postJson(`${BASE_URL}/webhook`, {
    event: "oos_visit",
    timestamp: new Date().toISOString(),
    page_url: `${BASE_URL}/`,
    product_id: "123456789",
    product_handle: "red-floral-kurta",
    variant_id: "4002",
    size_option: "M",
    aov: 1499,
    user_agent: "e2e"
  });
  ok(oos.status === 200, "ingest oos_visit");

  const notify = await postJson(`${BASE_URL}/webhook`, {
    event: "notify_intent",
    timestamp: new Date().toISOString(),
    page_url: `${BASE_URL}/`,
    product_id: "123456789",
    product_handle: "red-floral-kurta",
    variant_id: "4002",
    size_option: "M",
    whatsapp: "+919999999999",
    email: "test@example.com",
    aov: 1499,
    user_agent: "e2e"
  });
  ok(notify.status === 200, "ingest notify_intent");

  const report = await getJson(`${BASE_URL}/report/weekly?brand_name=Demo%20Brand&from=${from}&to=${to}`);
  ok(report.status === 200, "generate weekly report");
  ok(typeof report.json.message === "string" && report.json.message.includes("SizeSignal Weekly Report"), "weekly report has message");
  ok((report.json.total || 0) >= 1499, "weekly report includes missed revenue");

  const sendWeekly = await postForm(`${BASE_URL}/report/send-weekly`, {
    brand_name: "Demo Brand",
    from,
    to,
    founder_phone: "+919888888888"
  });
  ok(sendWeekly.status === 200 || sendWeekly.status === 302, "send weekly report (local WhatsApp)");

  const restock = await postForm(`${BASE_URL}/admin/send-restock-alerts`, {
    variant_id: "4002",
    product_url: "https://example.com/products/red-floral-kurta"
  });
  ok(restock.status === 200 || restock.status === 302, "send restock alerts (local WhatsApp)");

  const dataDir = path.join(__dirname, "..", "data");
  const eventsPath = path.join(dataDir, "events.jsonl");
  const waitlistPath = path.join(dataDir, "waitlist.jsonl");
  const messagesPath = path.join(dataDir, "messages.jsonl");

  ok(fs.existsSync(eventsPath), "events.jsonl exists");
  ok(fs.existsSync(waitlistPath), "waitlist.jsonl exists");
  ok(fs.existsSync(messagesPath), "messages.jsonl exists");

  const messages = fs.readFileSync(messagesPath, "utf8").trim().split("\n").filter(Boolean);
  ok(messages.length > 0, "messages.jsonl has entries");

  console.log("DONE");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
