require("dotenv").config();
try {
  require("dns").setDefaultResultOrder?.("ipv4first");
} catch {}

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const next = require("next");
const { createLocalProvider } = require("./sizesignal/messageProvider");
const { getEnv } = require("./src/env");
const { createPool } = require("./src/db");
const dbOps = require("./src/dbOps");
const shopify = require("./src/shopify");
const { enqueueWebhookJob } = require("./src/jobQueue");
const { startWebhookWorker } = require("./src/webhookWorker");
const { createMessageService } = require("./src/messageService");

const app = express();
const PORT = Number(process.env.PORT || 3001);

const DATA_DIR = path.join(__dirname, "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.jsonl");
const WAITLIST_FILE = path.join(DATA_DIR, "waitlist.jsonl");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.jsonl");
const RESTOCKS_FILE = path.join(DATA_DIR, "restocks.jsonl");
const messageProvider = createLocalProvider({ messagesFile: MESSAGES_FILE });

const env = getEnv();
const pool = createPool(env.databaseUrl);
const oauthState = new Map();
const SHOPIFY_API_VERSION = "2025-01";
const messageService = createMessageService({ pool, provider: messageProvider });
if (pool) startWebhookWorker({ pool, messageService, intervalMs: 1000 });

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function appendJsonl(filePath, obj) {
  ensureDataDir();
  fs.appendFileSync(filePath, `${JSON.stringify(obj)}\n`, "utf8");
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8");
  return content
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function isIsoDate(value) {
  if (typeof value !== "string") return false;
  const d = new Date(value);
  return !Number.isNaN(d.valueOf());
}

function normalizeEvent(body) {
  const event = typeof body?.event === "string" ? body.event.trim() : "";
  const timestamp = isIsoDate(body?.timestamp) ? body.timestamp : new Date().toISOString();
  const page_url = typeof body?.page_url === "string" ? body.page_url : "";
  const product_id = body?.product_id ?? "";
  const product_handle = body?.product_handle ?? "";
  const variant_id = body?.variant_id ?? "";
  const size_option = body?.size_option ?? "";
  const available = typeof body?.available === "boolean" ? body.available : null;
  const repeat_count = Number.isFinite(body?.repeat_count) ? body.repeat_count : null;
  const dwell_ms = Number.isFinite(body?.dwell_ms) ? body.dwell_ms : null;
  const whatsapp = typeof body?.whatsapp === "string" ? body.whatsapp.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const aov = Number.isFinite(body?.aov) ? body.aov : null;
  const user_agent = typeof body?.user_agent === "string" ? body.user_agent : "";

  return {
    event,
    timestamp,
    page_url,
    product_id,
    product_handle,
    variant_id,
    size_option,
    available,
    repeat_count,
    dwell_ms,
    whatsapp,
    email,
    aov,
    user_agent
  };
}

function validateEvent(e) {
  const allowed = new Set(["variant_view", "oos_visit", "notify_intent", "bounce", "restock_broadcast"]);
  if (!allowed.has(e.event)) return { ok: false, error: "invalid_event" };
  if (!e.variant_id) return { ok: false, error: "missing_variant_id" };
  if (!e.product_id) return { ok: false, error: "missing_product_id" };
  if (!e.page_url && e.event !== "restock_broadcast") return { ok: false, error: "missing_page_url" };
  if (e.event === "notify_intent" && !e.whatsapp) return { ok: false, error: "missing_whatsapp" };
  return { ok: true };
}

function groupKey(e) {
  return `${String(e.variant_id)}|${String(e.size_option || "")}|${String(e.product_handle || "")}`;
}

function rangeToEpochs(from, to) {
  const fromIso = typeof from === "string" && from.length === 10 ? `${from}T00:00:00.000Z` : from;
  const toIso = typeof to === "string" && to.length === 10 ? `${to}T23:59:59.999Z` : to;
  return {
    fromEpoch: new Date(fromIso).valueOf(),
    toEpoch: new Date(toIso).valueOf()
  };
}

function withinEpochRange(iso, fromEpoch, toEpoch) {
  const t = new Date(iso).valueOf();
  return t >= fromEpoch && t <= toEpoch;
}

function formatRs(n) {
  const num = Number.isFinite(n) ? n : 0;
  return Math.round(num).toLocaleString("en-IN");
}

function buildWeeklyReport({ brand_name, from, to, multiplier }) {
  const all = readJsonl(EVENTS_FILE);
  const { fromEpoch, toEpoch } = rangeToEpochs(from, to);
  const events = all.filter(e => e?.timestamp && withinEpochRange(e.timestamp, fromEpoch, toEpoch));

  const by = new Map();
  for (const e of events) {
    const key = groupKey(e);
    const cur = by.get(key) || {
      product_handle: e.product_handle || "",
      variant_id: e.variant_id,
      size_option: e.size_option || "",
      oos_visits: 0,
      notify_intents: 0,
      aov: 0
    };
    if (e.event === "oos_visit") cur.oos_visits += 1;
    if (e.event === "notify_intent") cur.notify_intents += 1;
    if (Number.isFinite(e.aov) && e.aov > 0) cur.aov = Math.max(cur.aov, e.aov);
    by.set(key, cur);
  }

  const rows = Array.from(by.values())
    .map(r => {
    const missed_revenue = (r.oos_visits || 0) * (r.aov || 0);
    const restock_units = Math.max(0, Math.round((r.notify_intents || 0) * multiplier));
    return { ...r, missed_revenue, restock_units };
    })
    .filter(r => (r.oos_visits || 0) > 0 || (r.notify_intents || 0) > 0);

  rows.sort((a, b) => b.missed_revenue - a.missed_revenue);
  const top = rows.slice(0, 3);
  const total = rows.reduce((sum, r) => sum + r.missed_revenue, 0);
  const oos_count = rows.filter(r => r.oos_visits > 0).length;

  const lines = top.map((r, idx) => {
    const title = r.product_handle ? r.product_handle.replace(/-/g, " ") : "Product";
    return [
      `${idx + 1}. ${title} — Size ${r.size_option || "?"}`,
      `   👀 ${r.oos_visits} visits | ${r.notify_intents} Notify Me | ₹${formatRs(r.missed_revenue)} missed revenue`,
      `   → Restock: ${r.restock_units} units recommended`
    ].join("\n");
  });

  const message = [
    `📦 SizeSignal Weekly Report — ${brand_name}`,
    `Week of ${from} to ${to}`,
    "",
    "🔴 TOP MISSED SALES THIS WEEK:",
    lines.length ? lines.join("\n\n") : "No out-of-stock demand captured this week.",
    "",
    `💡 This week you missed ₹${formatRs(total)} in potential revenue`,
    `   due to ${oos_count} out-of-stock variants.`,
    "",
    "Reply RESTOCK to send supplier alerts automatically."
  ].join("\n");

  return { rows, top, total, oos_count, message };
}

app.use(cors());

app.get("/healthz", async (req, res) => {
  try {
    if (pool) await pool.query("SELECT 1");
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

app.post("/webhooks/products_update", bodyParser.raw({ type: "application/json" }), async (req, res) => {
  try {
    const headerHmac = req.get("X-Shopify-Hmac-Sha256") || "";
    const shopDomain = req.get("X-Shopify-Shop-Domain") || "";
    const topic = req.get("X-Shopify-Topic") || "products/update";
    const webhookId = req.get("X-Shopify-Webhook-Id") || "";
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");

    if (!env.shopifyApiSecret) return res.status(500).send("Missing SHOPIFY_API_SECRET");
    if (!shopify.verifyWebhookHmac({ apiSecret: env.shopifyApiSecret, rawBody, headerHmac })) return res.status(401).send("Invalid HMAC");

    const payload = JSON.parse(rawBody.toString("utf8") || "{}");
    if (pool) {
      const store = await dbOps.getStoreByShop({ pool, shopDomain });
      await dbOps.logWebhook({ pool, storeId: store?.id, topic, shopDomain, webhookId, payload });
      if (store) {
        await enqueueWebhookJob({ pool, storeId: store.id, shopDomain, topic, webhookId, payload });
      }
    }
    res.status(200).send("ok");
  } catch (e) {
    res.status(200).send("ok");
  }
});

app.post("/webhooks/inventory_levels_update", bodyParser.raw({ type: "application/json" }), async (req, res) => {
  try {
    const headerHmac = req.get("X-Shopify-Hmac-Sha256") || "";
    const shopDomain = req.get("X-Shopify-Shop-Domain") || "";
    const topic = req.get("X-Shopify-Topic") || "inventory_levels/update";
    const webhookId = req.get("X-Shopify-Webhook-Id") || "";
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");

    if (!env.shopifyApiSecret) return res.status(500).send("Missing SHOPIFY_API_SECRET");
    if (!shopify.verifyWebhookHmac({ apiSecret: env.shopifyApiSecret, rawBody, headerHmac })) return res.status(401).send("Invalid HMAC");

    const payload = JSON.parse(rawBody.toString("utf8") || "{}");
    if (pool) {
      const store = await dbOps.getStoreByShop({ pool, shopDomain });
      await dbOps.logWebhook({ pool, storeId: store?.id, topic, shopDomain, webhookId, payload });
      if (store) {
        await enqueueWebhookJob({ pool, storeId: store.id, shopDomain, topic, webhookId, payload });
      }
    }
    res.status(200).send("ok");
  } catch {
    res.status(200).send("ok");
  }
});

app.use(bodyParser.json({ limit: "512kb" }));

app.get("/embed/sizesignal.js", async (req, res) => {
  const shop = shopify.normalizeShopDomain(req.query.shop);
  const sig = String(req.query.sig || "");
  const okSig = !env.embeddedSigSecret || shopify.verifyEmbedSig({ shop, sig, embeddedSigSecret: env.embeddedSigSecret });
  if (!shop || !okSig) return res.status(400).send("invalid");

  let widgetSettings = null;
  if (pool) {
    const store = await dbOps.getStoreByShop({ pool, shopDomain: shop });
    if (store) widgetSettings = await dbOps.getWidgetSettings({ pool, storeId: store.id });
  }

  const widgetEnabled = widgetSettings ? Boolean(widgetSettings.enabled) : true;
  const widgetPlacement = widgetSettings?.placement === "inline" ? "inline" : "floating";
  const widgetSelector = typeof widgetSettings?.selector === "string" ? widgetSettings.selector : "";
  const widgetPrimaryColor = typeof widgetSettings?.primary_color === "string" ? widgetSettings.primary_color : "#111827";
  const widgetHeadingText =
    typeof widgetSettings?.heading_text === "string" ? widgetSettings.heading_text : "Get restock alert on WhatsApp";
  const widgetButtonText = typeof widgetSettings?.button_text === "string" ? widgetSettings.button_text : "Notify me";
  const widgetConsentText =
    typeof widgetSettings?.consent_text === "string" ? widgetSettings.consent_text : "I agree to receive restock updates.";
  const widgetCustomCss = typeof widgetSettings?.custom_css === "string" ? widgetSettings.custom_css : "";

  const js = `
  (() => {
    const SHOP = ${JSON.stringify(shop)};
    const SIG = ${JSON.stringify(sig)};
    const API_BASE = location.origin;
    const WIDGET = ${JSON.stringify({
      enabled: widgetEnabled,
      placement: widgetPlacement,
      selector: widgetSelector,
      primaryColor: widgetPrimaryColor,
      headingText: widgetHeadingText,
      buttonText: widgetButtonText,
      consentText: widgetConsentText,
      customCss: widgetCustomCss
    })};

    function eventId() {
      try {
        return crypto?.randomUUID ? crypto.randomUUID() : (Date.now() + "_" + Math.random().toString(16).slice(2));
      } catch {
        return Date.now() + "_" + Math.random().toString(16).slice(2);
      }
    }

    function getVariantId() {
      const sel = document.querySelector('select[name="id"]');
      if (sel && sel.value) return String(sel.value);
      const hidden = document.querySelector('input[name="id"][type="hidden"]');
      if (hidden && hidden.value) return String(hidden.value);
      return "";
    }

    function getProductData() {
      const p = window.SizeSignalProduct || window.ShopifyAnalytics?.meta?.product || window.meta?.product || null;
      if (!p) return null;
      const variants = Array.isArray(p.variants) ? p.variants : [];
      return {
        product_id: p.id || p.product_id || "",
        product_handle: p.handle || "",
        product_title: p.title || "",
        variants: variants.map(v => ({
          id: v.id,
          title: v.title || "",
          option1: v.option1 || "",
          price: v.price || v.price_paise || 0,
          available: typeof v.available === "boolean" ? v.available : (Number(v.inventory_quantity || 0) > 0)
        }))
      };
    }

    function findVariant(p, variantId) {
      if (!p) return null;
      return p.variants.find(v => String(v.id) === String(variantId)) || null;
    }

    function postEvent(payload) {
      return fetch(API_BASE + "/api/demand-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    }

    function ensureWidget() {
      if (!WIDGET.enabled) return;
      if (document.getElementById("ss-embed-root")) return;
      const root = document.createElement("div");
      root.id = "ss-embed-root";
      if (WIDGET.placement === "floating") {
        root.style.position = "fixed";
        root.style.right = "16px";
        root.style.bottom = "16px";
        root.style.zIndex = "999999";
      }
      root.innerHTML = \`
        <div style="width:320px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px; box-shadow:0 12px 40px rgba(0,0,0,.12); display:none" id="ss-embed-card">
          <div style="font-weight:600; margin-bottom:8px" id="ss-embed-heading"></div>
          <div style="font-size:13px; color:#4b5563; margin-bottom:8px" id="ss-embed-meta"></div>
          <form id="ss-embed-form">
            <input type="tel" id="ss-embed-whatsapp" placeholder="+91XXXXXXXXXX" style="width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:10px; margin-bottom:8px" required />
            <input type="email" id="ss-embed-email" placeholder="Email (optional)" style="width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:10px; margin-bottom:8px" />
            <label style="display:flex; gap:8px; font-size:12px; color:#374151; margin-bottom:8px">
              <input type="checkbox" id="ss-embed-consent" required />
              <span id="ss-embed-consent-text"></span>
            </label>
            <button type="submit" id="ss-embed-submit" style="width:100%; padding:10px; border-radius:10px; border:0; background:#111827; color:#fff; cursor:pointer"></button>
            <div id="ss-embed-status" style="margin-top:8px; font-size:12px"></div>
          </form>
        </div>\`;
      if (WIDGET.placement === "inline") {
        const sel = WIDGET.selector || "#ss-embed-inline";
        const host = document.querySelector(sel);
        if (host) host.appendChild(root);
        else document.body.appendChild(root);
      } else {
        document.body.appendChild(root);
      }

      const heading = document.getElementById("ss-embed-heading");
      if (heading) heading.textContent = WIDGET.headingText || "Get restock alert on WhatsApp";
      const consentText = document.getElementById("ss-embed-consent-text");
      if (consentText) consentText.textContent = WIDGET.consentText || "I agree to receive restock updates.";
      const submit = document.getElementById("ss-embed-submit");
      if (submit) {
        submit.textContent = WIDGET.buttonText || "Notify me";
        submit.style.background = WIDGET.primaryColor || "#111827";
      }
    }

    function showWidget({ title, variantTitle }) {
      ensureWidget();
      const card = document.getElementById("ss-embed-card");
      const meta = document.getElementById("ss-embed-meta");
      if (!card || !meta) return;
      meta.textContent = (title ? title + " · " : "") + (variantTitle || "");
      card.style.display = "block";
    }

    function hideWidget() {
      const card = document.getElementById("ss-embed-card");
      if (card) card.style.display = "none";
    }

    function emitVariantView(p, v) {
      postEvent({
        shop: SHOP,
        sig: SIG,
        event_id: eventId(),
        event: "variant_view",
        timestamp: new Date().toISOString(),
        page_url: location.href,
        product_id: String(p.product_id || ""),
        product_handle: String(p.product_handle || ""),
        product_title: String(p.product_title || ""),
        variant_id: String(v?.id || ""),
        size_option: String(v?.option1 || v?.title || ""),
        available: Boolean(v?.available),
        price_paise: Number(v?.price || 0),
        user_agent: navigator.userAgent
      });
    }

    function emitOosVisit(p, v) {
      postEvent({
        shop: SHOP,
        sig: SIG,
        event_id: eventId(),
        event: "oos_visit",
        timestamp: new Date().toISOString(),
        page_url: location.href,
        product_id: String(p.product_id || ""),
        product_handle: String(p.product_handle || ""),
        product_title: String(p.product_title || ""),
        variant_id: String(v?.id || ""),
        size_option: String(v?.option1 || v?.title || ""),
        available: Boolean(v?.available),
        price_paise: Number(v?.price || 0),
        user_agent: navigator.userAgent
      });
    }

    function wire() {
      const p = getProductData();
      if (!p) return;

      if (WIDGET.customCss) {
        try {
          if (!document.getElementById("ss-custom-css")) {
            const style = document.createElement("style");
            style.id = "ss-custom-css";
            style.textContent = String(WIDGET.customCss || "");
            document.head.appendChild(style);
          }
        } catch {}
      }

      const update = () => {
        const variantId = getVariantId();
        const v = findVariant(p, variantId);
        if (!v) return;
        emitVariantView(p, v);
        if (WIDGET.enabled) {
          if (v.available) {
            hideWidget();
          } else {
            showWidget({ title: p.product_title, variantTitle: v.option1 || v.title });
            emitOosVisit(p, v);
          }
        } else if (!v.available) {
          emitOosVisit(p, v);
        }
      };

      document.addEventListener("change", (e) => {
        const t = e.target;
        if (!t) return;
        if (t.matches('select[name=\"id\"], input[name=\"id\"][type=\"hidden\"]')) update();
      });

      ensureWidget();
      const form = document.getElementById("ss-embed-form");
      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const status = document.getElementById("ss-embed-status");
          const whatsapp = document.getElementById("ss-embed-whatsapp")?.value || "";
          const email = document.getElementById("ss-embed-email")?.value || "";
          const consent = document.getElementById("ss-embed-consent")?.checked || false;
          if (!consent) { if (status) status.textContent = "Please accept consent."; return; }
          const variantId = getVariantId();
          const v = findVariant(p, variantId);
          if (!v) { if (status) status.textContent = "Variant not found."; return; }
          if (status) status.textContent = "Submitting…";
          await postEvent({
            shop: SHOP,
            sig: SIG,
            event_id: eventId(),
            event: "notify_intent",
            timestamp: new Date().toISOString(),
            page_url: location.href,
            product_id: String(p.product_id || ""),
            product_handle: String(p.product_handle || ""),
            product_title: String(p.product_title || ""),
            variant_id: String(v.id || ""),
            size_option: String(v.option1 || v.title || ""),
            available: Boolean(v.available),
            price_paise: Number(v.price || 0),
            whatsapp,
            email,
            user_agent: navigator.userAgent
          });
          if (status) status.textContent = "Done. We’ll notify you when it’s back.";
          form.reset();
        });
      }

      update();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
    else wire();
  })();
  `;

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.status(200).send(js);
});

app.post("/api/demand-event", async (req, res) => {
  try {
    const body = req.body || {};
    const shop = shopify.normalizeShopDomain(body.shop);
    const sig = String(body.sig || "");
    if (!shop) return res.status(400).json({ ok: false, error: "invalid_shop" });
    if (env.embeddedSigSecret && !shopify.verifyEmbedSig({ shop, sig, embeddedSigSecret: env.embeddedSigSecret })) {
      return res.status(401).json({ ok: false, error: "invalid_sig" });
    }

    const allowed = new Set(["variant_view", "oos_visit", "notify_intent", "bounce", "restock_broadcast"]);
    const event = typeof body.event === "string" ? body.event : "";
    if (!allowed.has(event)) return res.status(400).json({ ok: false, error: "invalid_event" });

    const timestamp = typeof body.timestamp === "string" && body.timestamp ? body.timestamp : new Date().toISOString();
    const productIdNum = Number(body.product_id);
    const variantIdNum = Number(body.variant_id);
    if (!Number.isFinite(productIdNum) || !Number.isFinite(variantIdNum)) return res.status(400).json({ ok: false, error: "invalid_ids" });

    const sizeOption = typeof body.size_option === "string" ? body.size_option : "";
    const pageUrl = typeof body.page_url === "string" ? body.page_url : "";
    const productHandle = typeof body.product_handle === "string" ? body.product_handle : "";
    const productTitle = typeof body.product_title === "string" ? body.product_title : "";
    const pricePaise = Number.isFinite(body.price_paise) ? body.price_paise : Math.round(Number(body.price || 0) * 100);
    const available = typeof body.available === "boolean" ? body.available : null;
    const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp : "";
    const email = typeof body.email === "string" ? body.email : "";
    const userAgent = typeof body.user_agent === "string" ? body.user_agent : "";
    const idempotencyKey =
      typeof body.event_id === "string" && body.event_id
        ? body.event_id
        : typeof body.idempotency_key === "string"
          ? body.idempotency_key
          : "";

    if (pool) {
      const store = await dbOps.getStoreByShop({ pool, shopDomain: shop });
      if (!store) return res.status(404).json({ ok: false, error: "store_not_installed" });

      const product = await dbOps.upsertProduct({
        pool,
        storeId: store.id,
        shopifyProductId: productIdNum,
        handle: productHandle,
        title: productTitle
      });
      const variant = await dbOps.upsertVariant({
        pool,
        storeId: store.id,
        productId: product.id,
        shopifyVariantId: variantIdNum,
        size: sizeOption,
        pricePaise: Number.isFinite(pricePaise) ? Math.round(pricePaise) : 0,
        sku: "",
        available: available === null ? true : available
      });
      await dbOps.insertDemandEventIdempotent({
        pool,
        storeId: store.id,
        productId: product.id,
        variantId: variant.id,
        event,
        eventAt: timestamp,
        pageUrl,
        pricePaise: Number.isFinite(pricePaise) ? Math.round(pricePaise) : 0,
        contactWhatsapp: whatsapp,
        contactEmail: email,
        userAgent,
        meta: {},
        idempotencyKey
      });
      if (event === "notify_intent" && whatsapp) {
        await dbOps.insertWaitlist({ pool, storeId: store.id, variantId: variant.id, whatsapp, email, subscribedAt: timestamp });
      }
    } else {
      appendJsonl(EVENTS_FILE, {
        event,
        timestamp,
        page_url: pageUrl,
        product_id: String(productIdNum),
        product_handle: productHandle,
        variant_id: String(variantIdNum),
        size_option: sizeOption,
        available,
        whatsapp,
        email,
        aov: null,
        user_agent: userAgent,
        received_at: new Date().toISOString(),
        ip: req.ip
      });
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.get("/api/dashboard/overview", async (req, res) => {
  try {
    const shopDomain = shopify.normalizeShopDomain(req.query.shop);
    if (!shopDomain) return res.status(400).json({ ok: false, error: "invalid_shop" });
    if (!pool) return res.status(400).json({ ok: false, error: "db_not_configured" });

    const store = await dbOps.getStoreByShop({ pool, shopDomain });
    if (!store) return res.status(404).json({ ok: false, error: "store_not_installed" });

    const days = 7;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const missedRevenue = await pool.query(
      "SELECT COALESCE(SUM(price_paise)::bigint, 0) AS missed_revenue_paise FROM demand_events WHERE store_id = $1 AND event = 'oos_visit' AND event_at >= $2",
      [store.id, since]
    );

    const customersWaiting = await pool.query(
      "SELECT COUNT(*)::int AS customers_waiting FROM waitlist WHERE store_id = $1 AND notified_at IS NULL",
      [store.id]
    );

    const topVariant = await pool.query(
      `
      SELECT
        v.id AS variant_db_id,
        v.shopify_variant_id,
        v.size,
        v.price_paise,
        p.title AS product_title,
        p.handle AS product_handle,
        COUNT(*)::int AS demand_count,
        COALESCE(SUM(e.price_paise)::bigint, 0) AS missed_revenue_paise
      FROM demand_events e
      JOIN variants v ON v.id = e.variant_id
      JOIN products p ON p.id = v.product_id
      WHERE e.store_id = $1 AND e.event_at >= $2 AND e.event IN ('notify_intent','oos_visit')
      GROUP BY v.id, v.shopify_variant_id, v.size, v.price_paise, p.title, p.handle
      ORDER BY demand_count DESC, missed_revenue_paise DESC
      LIMIT 1`,
      [store.id, since]
    );

    const topVariantRow = topVariant.rows[0] || null;
    const topRiskVariant = topVariantRow
      ? {
          productTitle: topVariantRow.product_title,
          productHandle: topVariantRow.product_handle,
          size: topVariantRow.size,
          demandCount: topVariantRow.demand_count,
          missedRevenuePaise: Number(topVariantRow.missed_revenue_paise || 0),
          badge:
            topVariantRow.demand_count >= 200 ? "critical" : topVariantRow.demand_count >= 80 ? "high" : "medium"
        }
      : null;

    const demandByVariant = await pool.query(
      `
      WITH agg AS (
        SELECT
          v.id AS variant_db_id,
          v.shopify_variant_id,
          p.title AS product_title,
          v.size,
          COUNT(*) FILTER (WHERE e.event IN ('notify_intent','oos_visit'))::int AS demand_count,
          COUNT(*) FILTER (WHERE e.event = 'notify_intent')::int AS notify_intents,
          COALESCE(SUM(e.price_paise) FILTER (WHERE e.event = 'oos_visit')::bigint, 0) AS missed_revenue_paise
        FROM demand_events e
        JOIN variants v ON v.id = e.variant_id
        JOIN products p ON p.id = v.product_id
        WHERE e.store_id = $1 AND e.event_at >= $2
        GROUP BY v.id, v.shopify_variant_id, p.title, v.size
      ),
      last_restock AS (
        SELECT
          v.id AS variant_db_id,
          MAX(il.updated_at) AS last_restocked_at
        FROM variants v
        JOIN inventory_levels il
          ON il.store_id = v.store_id
         AND il.inventory_item_id = v.inventory_item_id
        WHERE v.store_id = $1 AND il.available > 0
        GROUP BY v.id
      )
      SELECT
        a.*,
        lr.last_restocked_at
      FROM agg a
      LEFT JOIN last_restock lr ON lr.variant_db_id = a.variant_db_id
      WHERE a.demand_count > 0
      ORDER BY a.demand_count DESC, a.missed_revenue_paise DESC
      LIMIT 12`,
      [store.id, since]
    );

    const highRisk = await pool.query(
      `
      SELECT
        p.title AS product_title,
        p.handle AS product_handle,
        v.size,
        COUNT(*) FILTER (WHERE e.event IN ('notify_intent','oos_visit'))::int AS demand_count,
        COALESCE(SUM(e.price_paise) FILTER (WHERE e.event = 'oos_visit')::bigint, 0) AS missed_revenue_paise
      FROM demand_events e
      JOIN variants v ON v.id = e.variant_id
      JOIN products p ON p.id = v.product_id
      WHERE e.store_id = $1 AND e.event_at >= $2
      GROUP BY p.title, p.handle, v.size
      HAVING COUNT(*) FILTER (WHERE e.event IN ('notify_intent','oos_visit')) > 0
      ORDER BY missed_revenue_paise DESC
      LIMIT 12`,
      [store.id, since]
    );

    const maxDemand = demandByVariant.rows.reduce((m, r) => Math.max(m, Number(r.demand_count || 0)), 0) || 1;
    const urgencyScore = Math.round(((Number(topVariantRow?.demand_count || 0) / maxDemand) * 10) * 10) / 10;

    res.status(200).json({
      ok: true,
      shop: store.shop_domain,
      windowDays: days,
      kpis: {
        missedRevenuePaise: Number(missedRevenue.rows[0]?.missed_revenue_paise || 0),
        customersWaiting: Number(customersWaiting.rows[0]?.customers_waiting || 0),
        topRiskVariant,
        restockUrgencyScore: Number.isFinite(urgencyScore) ? urgencyScore : 0
      },
      demandByVariant: demandByVariant.rows.map(r => ({
        productTitle: r.product_title,
        size: r.size,
        demandCount: Number(r.demand_count || 0),
        notifyIntents: Number(r.notify_intents || 0),
        missedRevenuePaise: Number(r.missed_revenue_paise || 0),
        lastRestockedAt: r.last_restocked_at ? new Date(r.last_restocked_at).toISOString() : null
      })),
      highRisk: highRisk.rows.map(r => ({
        productTitle: r.product_title,
        productHandle: r.product_handle,
        size: r.size,
        demandCount: Number(r.demand_count || 0),
        missedRevenuePaise: Number(r.missed_revenue_paise || 0)
      }))
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.get("/api/store/status", async (req, res) => {
  try {
    const shopDomain = shopify.normalizeShopDomain(req.query.shop);
    if (!shopDomain) return res.status(400).json({ ok: false, error: "invalid_shop" });
    if (!pool) return res.status(400).json({ ok: false, error: "db_not_configured" });

    const store = await dbOps.getStoreByShop({ pool, shopDomain });
    if (!store) return res.status(200).json({ ok: true, shop: shopDomain, installed: false });

    const rows = await pool.query(
      `
      SELECT
        (SELECT COUNT(*)::int FROM products WHERE store_id = $1) AS products_count,
        (SELECT COUNT(*)::int FROM variants WHERE store_id = $1) AS variants_count,
        (SELECT COUNT(*)::int FROM demand_events WHERE store_id = $1) AS demand_events_count,
        (SELECT COUNT(*)::int FROM webhook_logs WHERE store_id = $1) AS webhooks_count
      `,
      [store.id]
    );

    res.status(200).json({
      ok: true,
      shop: store.shop_domain,
      installed: true,
      store: { id: store.id, plan: store.plan, createdAt: store.created_at, updatedAt: store.updated_at },
      counts: rows.rows[0] || { products_count: 0, variants_count: 0, demand_events_count: 0, webhooks_count: 0 }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.get("/api/widget/snippet", async (req, res) => {
  try {
    const shopDomain = shopify.normalizeShopDomain(req.query.shop);
    if (!shopDomain) return res.status(400).json({ ok: false, error: "invalid_shop" });
    const appUrl = env.appUrl || `${req.protocol}://${req.get("host")}`;
    const sig = shopify.signEmbed({ shop: shopDomain, embeddedSigSecret: env.embeddedSigSecret });
    const embedSrc = `${appUrl}/embed/sizesignal.js?shop=${encodeURIComponent(shopDomain)}${sig ? `&sig=${encodeURIComponent(sig)}` : ""}`;
    const manualInlineSnippet = `<div id="ss-embed-inline"></div>\n<script src="${embedSrc}"></script>`;
    res.status(200).json({ ok: true, shop: shopDomain, embedSrc, manualInlineSnippet });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.get("/api/widget/settings", async (req, res) => {
  try {
    const shopDomain = shopify.normalizeShopDomain(req.query.shop);
    if (!shopDomain) return res.status(400).json({ ok: false, error: "invalid_shop" });
    if (!pool) return res.status(400).json({ ok: false, error: "db_not_configured" });
    const store = await dbOps.getStoreByShop({ pool, shopDomain });
    if (!store) return res.status(404).json({ ok: false, error: "store_not_installed" });
    const settings = await dbOps.getWidgetSettings({ pool, storeId: store.id });
    res.status(200).json({ ok: true, shop: store.shop_domain, settings });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.put("/api/widget/settings", async (req, res) => {
  try {
    const shopDomain = shopify.normalizeShopDomain(req.query.shop);
    if (!shopDomain) return res.status(400).json({ ok: false, error: "invalid_shop" });
    if (!pool) return res.status(400).json({ ok: false, error: "db_not_configured" });
    const store = await dbOps.getStoreByShop({ pool, shopDomain });
    if (!store) return res.status(404).json({ ok: false, error: "store_not_installed" });

    const b = req.body || {};
    const placement = b.placement === "inline" ? "inline" : "floating";
    const selector = typeof b.selector === "string" ? b.selector.slice(0, 200) : "";
    const primaryColor = typeof b.primaryColor === "string" ? b.primaryColor.slice(0, 32) : "#111827";
    const headingText = typeof b.headingText === "string" ? b.headingText.slice(0, 120) : "Get restock alert on WhatsApp";
    const buttonText = typeof b.buttonText === "string" ? b.buttonText.slice(0, 40) : "Notify me";
    const consentText = typeof b.consentText === "string" ? b.consentText.slice(0, 180) : "I agree to receive restock updates.";
    const customCss = typeof b.customCss === "string" ? b.customCss.slice(0, 8000) : "";
    const enabled = typeof b.enabled === "boolean" ? b.enabled : true;

    const settings = await dbOps.upsertWidgetSettings({
      pool,
      storeId: store.id,
      enabled,
      placement,
      selector,
      primaryColor,
      headingText,
      buttonText,
      consentText,
      customCss
    });

    res.status(200).json({ ok: true, shop: store.shop_domain, settings });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.get("/api/reports/weekly", async (req, res) => {
  try {
    const shopDomain = shopify.normalizeShopDomain(req.query.shop);
    if (!shopDomain) return res.status(400).json({ ok: false, error: "invalid_shop" });
    if (!pool) return res.status(400).json({ ok: false, error: "db_not_configured" });
    const store = await dbOps.getStoreByShop({ pool, shopDomain });
    if (!store) return res.status(404).json({ ok: false, error: "store_not_installed" });

    const now = new Date();
    const defaultTo = now.toISOString().slice(0, 10);
    const defaultFrom = new Date(now.valueOf() - 7 * 86400000).toISOString().slice(0, 10);
    const from = typeof req.query.from === "string" && req.query.from.length === 10 ? req.query.from : defaultFrom;
    const to = typeof req.query.to === "string" && req.query.to.length === 10 ? req.query.to : defaultTo;
    const fromIso = `${from}T00:00:00.000Z`;
    const toIso = `${to}T23:59:59.999Z`;

    const agg = await pool.query(
      `
      SELECT
        p.title AS product_title,
        p.handle AS product_handle,
        v.shopify_variant_id,
        v.size,
        COUNT(*) FILTER (WHERE e.event = 'oos_visit')::int AS oos_visits,
        COUNT(*) FILTER (WHERE e.event = 'notify_intent')::int AS notify_intents,
        COALESCE(SUM(e.price_paise) FILTER (WHERE e.event = 'oos_visit')::bigint, 0) AS missed_revenue_paise
      FROM demand_events e
      JOIN variants v ON v.id = e.variant_id
      JOIN products p ON p.id = v.product_id
      WHERE e.store_id = $1
        AND e.event_at >= $2 AND e.event_at <= $3
        AND e.event IN ('oos_visit','notify_intent')
      GROUP BY p.title, p.handle, v.shopify_variant_id, v.size
      HAVING COUNT(*) FILTER (WHERE e.event IN ('oos_visit','notify_intent')) > 0
      ORDER BY missed_revenue_paise DESC, oos_visits DESC
      LIMIT 50
      `,
      [store.id, fromIso, toIso]
    );

    const rows = agg.rows.map(r => ({
      productTitle: r.product_title,
      productHandle: r.product_handle,
      shopifyVariantId: Number(r.shopify_variant_id || 0),
      size: r.size,
      oosVisits: Number(r.oos_visits || 0),
      notifyIntents: Number(r.notify_intents || 0),
      missedRevenuePaise: Number(r.missed_revenue_paise || 0)
    }));

    const totalMissedRevenuePaise = rows.reduce((sum, r) => sum + (Number.isFinite(r.missedRevenuePaise) ? r.missedRevenuePaise : 0), 0);
    const oosVariantCount = rows.filter(r => r.oosVisits > 0).length;
    const top = rows.slice(0, 3);
    const formatRsFromPaise = (p) => Math.round((Number(p || 0) / 100)).toLocaleString("en-IN");

    const messageLines = top.map((r, idx) => {
      const title = r.productTitle || (r.productHandle ? r.productHandle.replace(/-/g, " ") : "Product");
      return [
        `${idx + 1}. ${title} — Size ${r.size || "?"}`,
        `   👀 ${r.oosVisits} visits | ${r.notifyIntents} Notify Me | ₹${formatRsFromPaise(r.missedRevenuePaise)} missed`,
        `   → Action: restock + notify`
      ].join("\n");
    });

    const message = [
      `📦 SizeSignal Weekly Report — ${store.shop_domain}`,
      `Week of ${from} to ${to}`,
      "",
      "🔴 TOP MISSED SALES THIS WEEK:",
      messageLines.length ? messageLines.join("\n\n") : "No out-of-stock demand captured this week.",
      "",
      `💡 This week you missed ₹${formatRsFromPaise(totalMissedRevenuePaise)} in potential revenue`,
      `   due to ${oosVariantCount} out-of-stock variants.`
    ].join("\n");

    res.status(200).json({
      ok: true,
      shop: store.shop_domain,
      from,
      to,
      totalMissedRevenuePaise,
      oosVariantCount,
      top,
      rows,
      message
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.post("/api/dev/seed", async (req, res) => {
  try {
    if (!env.allowDevSeed) return res.status(403).json({ ok: false, error: "dev_seed_disabled" });
    const shopDomain = shopify.normalizeShopDomain(req.query.shop || req.body?.shop);
    if (!shopDomain) return res.status(400).json({ ok: false, error: "invalid_shop" });
    if (!pool) return res.status(400).json({ ok: false, error: "db_not_configured" });

    const store = await dbOps.getStoreByShop({ pool, shopDomain });
    if (!store) return res.status(404).json({ ok: false, error: "store_not_installed" });

    const existing = await pool.query("SELECT COUNT(*)::int AS c FROM variants WHERE store_id = $1", [store.id]);
    const variantsCount = Number(existing.rows[0]?.c || 0);

    const seededVariants = [];
    if (variantsCount === 0) {
      const products = [
        { id: 900001, handle: "floral-set", title: "Floral Set" },
        { id: 900002, handle: "classic-tee", title: "Classic Tee" },
        { id: 900003, handle: "linen-shirt", title: "Linen Shirt" }
      ];
      const sizes = ["S", "M", "L"];
      for (const p of products) {
        const prod = await dbOps.upsertProduct({ pool, storeId: store.id, shopifyProductId: p.id, handle: p.handle, title: p.title });
        for (let i = 0; i < sizes.length; i++) {
          const vId = p.id * 10 + (i + 1);
          const v = await dbOps.upsertVariant({
            pool,
            storeId: store.id,
            productId: prod.id,
            shopifyVariantId: vId,
            size: sizes[i],
            pricePaise: 129900 + i * 10000,
            sku: `${p.handle}-${sizes[i]}`,
            available: true,
            inventoryItemId: 8000000 + vId
          });
          seededVariants.push({ ...v, productTitle: p.title });
        }
      }
    } else {
      const r = await pool.query(
        "SELECT v.*, p.title AS product_title FROM variants v JOIN products p ON p.id = v.product_id WHERE v.store_id = $1 LIMIT 12",
        [store.id]
      );
      for (const v of r.rows) seededVariants.push({ ...v, productTitle: v.product_title });
    }

    const variants = seededVariants.slice(0, 9);
    const now = Date.now();
    const rnd = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

    let demandInserted = 0;
    let waitlistInserted = 0;
    for (const v of variants) {
      const oos = rnd(8, 28);
      const notify = rnd(2, 10);
      for (let i = 0; i < oos; i++) {
        const t = new Date(now - rnd(0, 13) * 86400000 - rnd(0, 86400000)).toISOString();
        await dbOps.insertDemandEventIdempotent({
          pool,
          storeId: store.id,
          productId: v.product_id,
          variantId: v.id,
          event: "oos_visit",
          eventAt: t,
          pageUrl: `https://${store.shop_domain}/products/${encodeURIComponent(v.productTitle || "product")}`,
          pricePaise: Number(v.price_paise || 0),
          contactWhatsapp: "",
          contactEmail: "",
          userAgent: "mock",
          meta: { mock: true },
          idempotencyKey: `seed:oos:${v.id}:${i}:${t}`
        });
        demandInserted += 1;
      }
      for (let i = 0; i < notify; i++) {
        const t = new Date(now - rnd(0, 13) * 86400000 - rnd(0, 86400000)).toISOString();
        const phone = `+9199${rnd(10000000, 99999999)}`;
        const email = `user${rnd(1000, 9999)}@example.com`;
        const ev = await dbOps.insertDemandEventIdempotent({
          pool,
          storeId: store.id,
          productId: v.product_id,
          variantId: v.id,
          event: "notify_intent",
          eventAt: t,
          pageUrl: `https://${store.shop_domain}/products/${encodeURIComponent(v.productTitle || "product")}`,
          pricePaise: Number(v.price_paise || 0),
          contactWhatsapp: phone,
          contactEmail: email,
          userAgent: "mock",
          meta: { mock: true },
          idempotencyKey: `seed:notify:${v.id}:${i}:${t}`
        });
        if (ev) {
          const w = await dbOps.insertWaitlist({ pool, storeId: store.id, variantId: v.id, whatsapp: phone, email, subscribedAt: t });
          if (w) waitlistInserted += 1;
        }
        demandInserted += 1;
      }
    }

    let ordersInserted = 0;
    let lineItemsInserted = 0;
    for (let i = 0; i < 10; i++) {
      const createdAt = new Date(now - rnd(0, 20) * 86400000 - rnd(0, 86400000)).toISOString();
      const order = await dbOps.insertOrder({
        pool,
        storeId: store.id,
        shopifyOrderId: null,
        orderNumber: `MOCK-${1000 + i}`,
        currency: "INR",
        totalPricePaise: 0,
        customerEmail: `buyer${rnd(1000, 9999)}@example.com`,
        customerPhone: `+9198${rnd(10000000, 99999999)}`,
        processedAt: createdAt,
        meta: { mock: true }
      });
      ordersInserted += 1;
      const itemCount = rnd(1, 3);
      const items = [];
      let total = 0;
      for (let j = 0; j < itemCount; j++) {
        const vv = variants[rnd(0, variants.length - 1)];
        const qty = rnd(1, 2);
        const price = Number(vv.price_paise || 0);
        total += price * qty;
        items.push({ variantId: vv.id, quantity: qty, pricePaise: price, title: `${vv.productTitle || "Product"} · ${vv.size || ""}`.trim() });
      }
      await pool.query("UPDATE orders SET total_price_paise = $1 WHERE id = $2", [total, order.id]);
      const inserted = await dbOps.insertOrderLineItems({ pool, storeId: store.id, orderId: order.id, items });
      lineItemsInserted += inserted;
    }

    res.status(200).json({
      ok: true,
      shop: store.shop_domain,
      seededVariants: seededVariants.length,
      demandInserted,
      waitlistInserted,
      ordersInserted,
      lineItemsInserted
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.post("/api/shopify/sync", async (req, res) => {
  try {
    const shopDomain = shopify.normalizeShopDomain(req.query.shop || req.body?.shop);
    if (!shopDomain) return res.status(400).json({ ok: false, error: "invalid_shop" });
    if (!pool) return res.status(400).json({ ok: false, error: "db_not_configured" });
    const adminToken = String(process.env.APP_ADMIN_TOKEN || "");
    if (adminToken) {
      const auth = String(req.get("authorization") || "");
      if (auth !== `Bearer ${adminToken}`) return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const store = await dbOps.getStoreByShop({ pool, shopDomain });
    if (!store) return res.status(404).json({ ok: false, error: "store_not_installed" });

    if (String(store.access_token_enc || "").startsWith("enc:") && !env.encryptionKey) {
      return res.status(400).json({ ok: false, error: "missing_APP_ENCRYPTION_KEY" });
    }
    const accessToken = shopify.decryptAccessToken({ accessTokenEnc: store.access_token_enc, encryptionKey: env.encryptionKey });
    if (!accessToken) return res.status(500).json({ ok: false, error: "missing_access_token" });

    const apiVersion = SHOPIFY_API_VERSION;
    const maxPages = Math.max(1, Math.min(10, Number(req.body?.maxPages || req.query.maxPages || 4)));
    const limit = Math.max(1, Math.min(250, Number(req.body?.limit || req.query.limit || 100)));

    const parseNextPageInfo = (linkHeader) => {
      const link = String(linkHeader || "");
      if (!link) return "";
      const parts = link.split(",").map(s => s.trim());
      const next = parts.find(p => /rel="next"/i.test(p));
      if (!next) return "";
      const m = next.match(/<([^>]+)>/);
      if (!m) return "";
      const u = new URL(m[1]);
      return u.searchParams.get("page_info") || "";
    };

    let pageInfo = "";
    let pages = 0;
    let productsSeen = 0;
    let variantsSeen = 0;
    let productsUpserted = 0;
    let variantsUpserted = 0;

    while (pages < maxPages) {
      const path = pageInfo
        ? `/admin/api/${apiVersion}/products.json?limit=${limit}&page_info=${encodeURIComponent(pageInfo)}`
        : `/admin/api/${apiVersion}/products.json?limit=${limit}`;

      const { json, headers } = await shopify.shopifyRestWithHeaders({
        shop: shopDomain,
        accessToken,
        method: "GET",
        path
      });

      const products = Array.isArray(json?.products) ? json.products : [];
      pages += 1;

      for (const p of products) {
        const productRow = await dbOps.upsertProduct({
          pool,
          storeId: store.id,
          shopifyProductId: String(p?.id || ""),
          handle: String(p?.handle || ""),
          title: String(p?.title || "")
        });
        productsUpserted += productRow ? 1 : 0;
        productsSeen += 1;

        const vs = Array.isArray(p?.variants) ? p.variants : [];
        for (const v of vs) {
          const price = Number(v?.price || 0);
          const pricePaise = Number.isFinite(price) ? Math.round(price * 100) : 0;
          const inventoryQty = Number(v?.inventory_quantity || 0);
          const available = Number.isFinite(inventoryQty) ? inventoryQty > 0 : false;
          const size = String(v?.option1 || v?.title || "");
          const variantRow = await dbOps.upsertVariant({
            pool,
            storeId: store.id,
            productId: productRow?.id || null,
            shopifyVariantId: String(v?.id || ""),
            size,
            pricePaise,
            sku: String(v?.sku || ""),
            available,
            inventoryItemId: Number.isFinite(Number(v?.inventory_item_id)) ? Number(v.inventory_item_id) : null
          });
          variantsUpserted += variantRow ? 1 : 0;
          variantsSeen += 1;
        }
      }

      pageInfo = parseNextPageInfo(headers?.get?.("link") || headers?.get?.("Link"));
      if (!pageInfo || products.length === 0) break;
    }

    res.status(200).json({
      ok: true,
      shop: store.shop_domain,
      pages,
      productsSeen,
      variantsSeen,
      productsUpserted,
      variantsUpserted
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.get("/auth", async (req, res) => {
  try {
    const shop = shopify.normalizeShopDomain(req.query.shop);
    if (!shop) {
      const appUrl = env.appUrl || `${req.protocol}://${req.get("host")}`;
      return res.status(400).send(`
        <html>
          <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px;">
            <h2>Invalid shop</h2>
            <p>Use a valid <code>*.myshopify.com</code> domain.</p>
            <p>Example:</p>
            <pre style="background:#f6f8fa;padding:12px;border-radius:8px;overflow:auto;">${appUrl}/auth?shop=chatalytix.myshopify.com</pre>
          </body>
        </html>
      `);
    }
    if (!env.shopifyApiKey || !env.shopifyApiSecret) return res.status(500).send("Missing SHOPIFY_API_KEY/SHOPIFY_API_SECRET");
    if (!pool) return res.status(500).send("Missing DATABASE_URL");

    const state = crypto.randomBytes(16).toString("hex");
    oauthState.set(state, { shop, createdAt: Date.now() });

    const appUrl = env.appUrl || `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${appUrl}/auth/callback`;
    const url = shopify.buildAuthUrl({
      shop,
      apiKey: env.shopifyApiKey,
      scopes: env.shopifyScopes,
      redirectUri,
      state
    });
    res.redirect(url);
  } catch (e) {
    res.status(500).send(String(e?.message || e));
  }
});

app.get("/auth/callback", async (req, res) => {
  try {
    const shop = shopify.normalizeShopDomain(req.query.shop);
    if (!shop) return res.status(400).send("Invalid shop");
    if (!env.shopifyApiKey || !env.shopifyApiSecret) return res.status(500).send("Missing SHOPIFY_API_KEY/SHOPIFY_API_SECRET");
    if (!pool) return res.status(500).send("Missing DATABASE_URL");

    const state = String(req.query.state || "");
    const stateRec = oauthState.get(state);
    if (!stateRec || stateRec.shop !== shop) return res.status(400).send("Invalid state");
    oauthState.delete(state);

    const ok = shopify.verifyOauthHmac({ query: req.query, apiSecret: env.shopifyApiSecret });
    if (!ok) return res.status(400).send("Invalid HMAC");

    const code = String(req.query.code || "");
    if (!code) return res.status(400).send("Missing code");

    const tokenRes = await shopify.exchangeAccessToken({
      shop,
      apiKey: env.shopifyApiKey,
      apiSecret: env.shopifyApiSecret,
      code
    });
    const accessToken = String(tokenRes.access_token || "");
    if (!accessToken) return res.status(500).send("Missing access token in response");

    const accessTokenEnc = shopify.encryptAccessToken({ accessToken, encryptionKey: env.encryptionKey });
    const store = await dbOps.upsertStore({ pool, shopDomain: shop, accessTokenEnc, plan: "free" });

    const appUrl = env.appUrl || `${req.protocol}://${req.get("host")}`;
    const sig = shopify.signEmbed({ shop, embeddedSigSecret: env.embeddedSigSecret });
    const src = `${appUrl}/embed/sizesignal.js?shop=${encodeURIComponent(shop)}${sig ? `&sig=${encodeURIComponent(sig)}` : ""}`;

    const results = { webhooks: [], scriptTag: null };

    try {
      await shopify.registerWebhook({
        shop,
        accessToken,
        topic: "products/update",
        address: `${appUrl}/webhooks/products_update`,
        apiVersion: SHOPIFY_API_VERSION
      });
      results.webhooks.push({ topic: "products/update", ok: true });
    } catch (e) {
      results.webhooks.push({ topic: "products/update", ok: false, error: String(e?.message || e) });
    }

    try {
      await shopify.registerWebhook({
        shop,
        accessToken,
        topic: "inventory_levels/update",
        address: `${appUrl}/webhooks/inventory_levels_update`,
        apiVersion: SHOPIFY_API_VERSION
      });
      results.webhooks.push({ topic: "inventory_levels/update", ok: true });
    } catch (e) {
      results.webhooks.push({ topic: "inventory_levels/update", ok: false, error: String(e?.message || e) });
    }

    try {
      await shopify.createScriptTag({ shop, accessToken, src, apiVersion: SHOPIFY_API_VERSION });
      results.scriptTag = { ok: true, src };
    } catch (e) {
      results.scriptTag = { ok: false, error: String(e?.message || e), src };
    }

    const webhookOk = results.webhooks.every(w => w.ok);
    const scriptOk = results.scriptTag?.ok;
    if (webhookOk && scriptOk) {
      return res.redirect(`/app?shop=${encodeURIComponent(store.shop_domain)}`);
    }

    res.status(207).send(`
      <html>
        <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px;">
          <h2>Install result</h2>
          <p><b>Shop:</b> ${store.shop_domain}</p>
          <p><a href="/app?shop=${encodeURIComponent(store.shop_domain)}">Open app</a></p>
          <p><b>ScriptTag:</b> ${scriptOk ? "OK" : "FAILED"}</p>
          <p><b>Webhooks:</b></p>
          <pre style="background:#f6f8fa;padding:12px;border-radius:8px;overflow:auto;">${JSON.stringify(results, null, 2)}</pre>
          <p style="max-width: 780px;">
            If webhooks fail with “Invalid topic specified”, ensure your Partner app has Admin API access scopes enabled for products/inventory and can create webhooks (e.g. <code>read_products</code>, <code>read_inventory</code>, <code>write_webhooks</code>), then reinstall.
          </p>
        </body>
      </html>
    `);
  } catch (e) {
    res.status(500).send(String(e?.message || e));
  }
});

app.get("/", (req, res) => {
  res.redirect("/app");
});

app.get("/demo", (req, res) => {
  res.sendFile(path.join(__dirname, "demo.html"));
});

app.get("/admin", (req, res) => {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.valueOf() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const report = buildWeeklyReport({ brand_name: "Demo Brand", from, to, multiplier: 2.5 });
  const lastEvents = readJsonl(EVENTS_FILE).slice(-30).reverse();
  const lastMessages = readJsonl(MESSAGES_FILE).slice(-20).reverse();

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>SizeSignal Admin</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:16px;max-width:980px;margin:0 auto}
        .card{border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin:12px 0}
        pre{background:#0b1020;color:#e5e7eb;padding:12px;border-radius:10px;overflow:auto}
        table{width:100%;border-collapse:collapse}
        td,th{border-bottom:1px solid #eee;padding:8px;text-align:left;font-size:14px}
        input,button{padding:10px;border-radius:8px;border:1px solid #ddd}
        button{background:#111;color:#fff;border:0;cursor:pointer}
        button:hover{opacity:.9}
        .row{display:flex;gap:8px;flex-wrap:wrap}
      </style>
    </head>
    <body>
      <h2>SizeSignal Admin</h2>
      <div class="card">
        <div class="row">
          <form method="POST" action="/report/send-weekly">
            <input type="hidden" name="brand_name" value="Demo Brand" />
            <input type="date" name="from" value="${from}" />
            <input type="date" name="to" value="${to}" />
            <input type="text" name="founder_phone" placeholder="+91XXXXXXXXXX" />
            <button type="submit">Send Weekly WhatsApp</button>
          </form>
        </div>
      </div>
      <div class="card">
        <h3>Weekly Message Preview</h3>
        <pre>${report.message.replace(/</g, "&lt;")}</pre>
      </div>
      <div class="card">
        <h3>Top Missed Sales</h3>
        <table>
          <thead><tr><th>Variant</th><th>Size</th><th>OOS Visits</th><th>Notify</th><th>Missed ₹</th><th>Units</th></tr></thead>
          <tbody>
            ${report.top
              .map(r => `<tr><td>${String(r.variant_id)}</td><td>${String(r.size_option)}</td><td>${r.oos_visits}</td><td>${r.notify_intents}</td><td>₹${formatRs(r.missed_revenue)}</td><td>${r.restock_units}</td></tr>`)
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3>Restock + Customer Broadcast</h3>
        <form method="POST" action="/admin/send-restock-alerts" class="row">
          <input type="text" name="variant_id" placeholder="variant_id (e.g. 4002)" required />
          <input type="text" name="product_url" placeholder="product url (optional)" />
          <button type="submit">Send Restock Alerts</button>
        </form>
      </div>
      <div class="card">
        <h3>Recent Events</h3>
        <table>
          <thead><tr><th>Time</th><th>Event</th><th>Variant</th><th>Size</th><th>WhatsApp</th></tr></thead>
          <tbody>
            ${lastEvents
              .map(e => `<tr><td>${String(e.timestamp).slice(0, 19).replace("T", " ")}</td><td>${String(e.event)}</td><td>${String(e.variant_id)}</td><td>${String(e.size_option || "")}</td><td>${String(e.whatsapp || "")}</td></tr>`)
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3>Recent Messages (Local WhatsApp)</h3>
        <table>
          <thead><tr><th>Time</th><th>To</th><th>Body</th></tr></thead>
          <tbody>
            ${lastMessages
              .map(m => `<tr><td>${String(m.timestamp).slice(0, 19).replace("T", " ")}</td><td>${String(m.to)}</td><td>${String(m.body).replace(/</g, "&lt;")}</td></tr>`)
              .join("")}
          </tbody>
        </table>
      </div>
    </body>
  </html>`;
  res.status(200).send(html);
});

app.post("/webhook", (req, res) => {
  const e = normalizeEvent(req.body || {});
  const v = validateEvent(e);
  if (!v.ok) return res.status(400).json({ ok: false, error: v.error });

  const stored = { ...e, received_at: new Date().toISOString(), ip: req.ip };
  appendJsonl(EVENTS_FILE, stored);

  if (stored.event === "notify_intent") {
    appendJsonl(WAITLIST_FILE, {
      variant_id: stored.variant_id,
      size_option: stored.size_option,
      product_id: stored.product_id,
      product_handle: stored.product_handle,
      whatsapp: stored.whatsapp,
      email: stored.email,
      subscribed_at: stored.timestamp
    });
  }

  res.status(200).json({ ok: true });
});

app.get("/report/weekly", (req, res) => {
  const brand_name = typeof req.query.brand_name === "string" ? req.query.brand_name : "Demo Brand";
  const from = typeof req.query.from === "string" ? req.query.from : new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const to = typeof req.query.to === "string" ? req.query.to : new Date().toISOString().slice(0, 10);
  const multiplier = req.query.multiplier ? Number(req.query.multiplier) : 2.5;
  const report = buildWeeklyReport({ brand_name, from, to, multiplier: Number.isFinite(multiplier) ? multiplier : 2.5 });
  res.status(200).json(report);
});

app.use(bodyParser.urlencoded({ extended: false }));

app.post("/report/send-weekly", (req, res) => {
  const brand_name = typeof req.body.brand_name === "string" ? req.body.brand_name : "Demo Brand";
  const from = typeof req.body.from === "string" ? req.body.from : new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const to = typeof req.body.to === "string" ? req.body.to : new Date().toISOString().slice(0, 10);
  const founder_phone = typeof req.body.founder_phone === "string" ? req.body.founder_phone.trim() : "";
  const report = buildWeeklyReport({ brand_name, from, to, multiplier: 2.5 });

  if (!founder_phone) return res.status(400).send("Missing founder_phone");
  messageProvider.sendWhatsApp({ to: founder_phone, body: report.message, meta: { type: "weekly_report", from, to } });
  res.redirect("/admin");
});

app.post("/admin/restock", (req, res) => {
  const variant_id = req.body?.variant_id ?? "";
  if (!variant_id) return res.status(400).json({ ok: false, error: "missing_variant_id" });
  const restock = { variant_id, timestamp: new Date().toISOString() };
  appendJsonl(RESTOCKS_FILE, restock);
  res.status(200).json({ ok: true });
});

app.post("/admin/send-restock-alerts", (req, res) => {
  const variant_id = typeof req.body.variant_id === "string" ? req.body.variant_id.trim() : "";
  const product_url = typeof req.body.product_url === "string" ? req.body.product_url.trim() : "";
  if (!variant_id) return res.status(400).send("Missing variant_id");

  const waitlist = readJsonl(WAITLIST_FILE).filter(w => String(w.variant_id) === String(variant_id));
  const handle = waitlist[0]?.product_handle || "this product";
  const size = waitlist[0]?.size_option || "";
  const title = handle.replace(/-/g, " ");

  for (const w of waitlist) {
    const body = `Hi! The ${title} Size ${size || "?"} you wanted is back in stock. Shop now → ${product_url || "(add product_url in admin)"}`;
    messageProvider.sendWhatsApp({ to: w.whatsapp, body, meta: { type: "restock_alert", variant_id } });
  }

  appendJsonl(EVENTS_FILE, {
    event: "restock_broadcast",
    timestamp: new Date().toISOString(),
    page_url: product_url || "",
    product_id: waitlist[0]?.product_id || "",
    product_handle: handle,
    variant_id,
    size_option: size,
    available: true,
    repeat_count: null,
    dwell_ms: null,
    whatsapp: "",
    email: "",
    aov: null,
    user_agent: "",
    received_at: new Date().toISOString(),
    ip: ""
  });

  res.redirect("/admin");
});

async function start() {
  ensureDataDir();

  const dev = process.env.NODE_ENV !== "production";
  const nextApp = next({ dev, dir: path.join(__dirname, "dashboard") });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  const allowFrame = (res) => {
    try {
      res.removeHeader("X-Frame-Options");
    } catch {}
    res.setHeader("Content-Security-Policy", "frame-ancestors https://*.myshopify.com https://admin.shopify.com;");
  };

  app.all("/app", (req, res) => {
    allowFrame(res);
    return handle(req, res);
  });
  app.all("/app/*", (req, res) => {
    allowFrame(res);
    return handle(req, res);
  });

  app.listen(PORT, () => {
    console.log(`\nSizeSignal Server: http://localhost:${PORT}`);
    console.log(`App: http://localhost:${PORT}/app`);
    console.log(`Demo: http://localhost:${PORT}/demo`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
    console.log(`Webhook: http://localhost:${PORT}/webhook\n`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
