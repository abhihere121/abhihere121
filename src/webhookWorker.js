const dbOps = require("./dbOps");
const { claimJobs, markJobDone, markJobFailed, enqueueWebhookJob } = require("./jobQueue");

async function processProductsUpdate({ pool, job }) {
  const payload = job.payload || {};
  const storeId = job.store_id;
  if (!storeId) return;
  if (!payload?.id) return;

  const product = await dbOps.upsertProduct({
    pool,
    storeId,
    shopifyProductId: Number(payload.id),
    handle: payload.handle || "",
    title: payload.title || "",
    vendor: payload.vendor || ""
  });

  const variants = Array.isArray(payload.variants) ? payload.variants : [];
  for (const v of variants) {
    const pricePaise = Math.round(Number(v.price || 0) * 100);
    const available = Number(v.inventory_quantity || 0) > 0;
    await dbOps.upsertVariant({
      pool,
      storeId,
      productId: product.id,
      shopifyVariantId: Number(v.id),
      size: v.option1 || v.title || "",
      pricePaise,
      sku: v.sku || "",
      available,
      inventoryItemId: Number(v.inventory_item_id)
    });
  }
}

async function processInventoryLevelsUpdate({ pool, job }) {
  const payload = job.payload || {};
  const storeId = job.store_id;
  if (!storeId) return;

  const inventoryItemId = Number(payload.inventory_item_id);
  const locationId = Number(payload.location_id);
  const available = Number(payload.available);
  if (!Number.isFinite(inventoryItemId) || !Number.isFinite(locationId) || !Number.isFinite(available)) return;

  const { prevAvailable } = await dbOps.upsertInventoryLevel({
    pool,
    storeId,
    inventoryItemId,
    locationId,
    available,
    inventoryUpdatedAt: payload.updated_at || payload.updatedAt || ""
  });

  const restock = prevAvailable === 0 && available > 0;
  if (!restock) return;

  const variant = await dbOps.getVariantByInventoryItem({ pool, storeId, inventoryItemId });
  if (!variant) return;

  await enqueueWebhookJob({
    pool,
    storeId,
    shopDomain: job.shop_domain || "",
    topic: "restock/broadcast",
    webhookId: `${job.webhook_id}:restock:${String(variant.shopify_variant_id)}`,
    payload: {
      variant_db_id: variant.id,
      shopify_variant_id: variant.shopify_variant_id,
      product_handle: variant.product_handle || "",
      product_title: variant.product_title || "",
      size: variant.size || "",
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available
    }
  });
}

async function processRestockBroadcast({ pool, job, messageService }) {
  const payload = job.payload || {};
  const storeId = job.store_id;
  if (!storeId) return;

  const variantDbId = payload.variant_db_id;
  if (!variantDbId) return;

  const waitlist = await dbOps.listWaitlistForVariant({ pool, storeId, variantDbId });
  if (waitlist.length === 0) return;

  const shopDomain = job.shop_domain || "";
  const productHandle = payload.product_handle || "";
  const productTitle = payload.product_title || productHandle.replace(/-/g, " ");
  const size = payload.size || "";
  const shopifyVariantId = payload.shopify_variant_id ? String(payload.shopify_variant_id) : "";
  const link = shopDomain && productHandle ? `https://${shopDomain}/products/${productHandle}${shopifyVariantId ? `?variant=${shopifyVariantId}` : ""}` : "";

  const notifiedAt = new Date().toISOString();
  const sentTo = [];
  for (const w of waitlist) {
    const body = `Good news! Your size ${size || "?"} in ${productTitle || "this product"} is back in stock.${link ? ` Shop now: ${link}` : ""}`;

    // 1. WhatsApp Notification
    await messageService.sendWhatsApp({
      storeId,
      toNumber: w.whatsapp,
      template: "restock_alert",
      body,
      meta: { variant_db_id: variantDbId, shopify_variant_id: shopifyVariantId }
    });

    // 2. Klaviyo Event (Growth Feature)
    if (w.email) {
      await messageService.trackKlaviyoEvent({
        storeId,
        email: w.email,
        eventName: "Restock Alert Sent",
        properties: {
          product_title: productTitle,
          variant_size: size,
          product_url: link
        }
      });
    }
    sentTo.push(w.whatsapp);
  }

  await dbOps.markWaitlistNotified({ pool, storeId, variantDbId, whatsappList: sentTo, notifiedAt });
  await dbOps.insertDemandEventIdempotent({
    pool,
    storeId,
    productId: null,
    variantId: variantDbId,
    event: "restock_broadcast",
    eventAt: notifiedAt,
    pageUrl: link,
    pricePaise: 0,
    contactWhatsapp: "",
    contactEmail: "",
    userAgent: "worker",
    meta: { count: sentTo.length },
    idempotencyKey: `job:${job.id}`
  });
}

async function processJob({ pool, job, messageService }) {
  const topic = String(job.topic || "");
  if (topic === "products/update") return processProductsUpdate({ pool, job });
  if (topic === "inventory_levels/update") return processInventoryLevelsUpdate({ pool, job });
  if (topic === "restock/broadcast") return processRestockBroadcast({ pool, job, messageService });
}

function startWebhookWorker({ pool, messageService, intervalMs }) {
  let stopped = false;
  const ms = Math.max(250, Number(intervalMs) || 1000);

  const tick = async () => {
    if (stopped) return;
    try {
      const jobs = await claimJobs({ pool, limit: 10 });
      for (const job of jobs) {
        try {
          await processJob({ pool, job, messageService });
          await markJobDone({ pool, jobId: job.id });
        } catch (err) {
          const backoff = Math.min(3600, Math.pow(2, Math.max(0, Number(job.attempts) || 1)) * 5);
          await markJobFailed({ pool, jobId: job.id, error: err?.message || String(err), backoffSeconds: backoff, maxAttempts: 10 });
        }
      }
    } catch { }
  };

  const handle = setInterval(tick, ms);
  tick();
  return () => {
    stopped = true;
    clearInterval(handle);
  };
}

module.exports = { startWebhookWorker };
