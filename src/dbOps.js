async function upsertStore({ pool, shopDomain, accessTokenEnc, plan }) {
  const q = `
    INSERT INTO stores (shop_domain, access_token_enc, plan)
    VALUES ($1, $2, COALESCE($3::sizesignal_plan, 'free'::sizesignal_plan))
    ON CONFLICT (shop_domain)
    DO UPDATE SET access_token_enc = EXCLUDED.access_token_enc, plan = EXCLUDED.plan, updated_at = now()
    RETURNING *`;
  const r = await pool.query(q, [shopDomain, accessTokenEnc, plan || "free"]);
  return r.rows[0];
}

async function getStoreByShop({ pool, shopDomain }) {
  const r = await pool.query("SELECT * FROM stores WHERE shop_domain = $1", [shopDomain]);
  return r.rows[0] || null;
}

async function logWebhook({ pool, storeId, topic, shopDomain, webhookId, payload }) {
  await pool.query(
    "INSERT INTO webhook_logs(store_id, topic, shop_domain, webhook_id, payload) VALUES ($1,$2,$3,$4,$5::jsonb)",
    [storeId || null, topic || "", shopDomain || "", webhookId || "", JSON.stringify(payload || {})]
  );
}

async function upsertProduct({ pool, storeId, shopifyProductId, handle, title, vendor }) {
  const q = `
    INSERT INTO products(store_id, shopify_product_id, handle, title, vendor)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (store_id, shopify_product_id)
    DO UPDATE SET handle = EXCLUDED.handle, title = EXCLUDED.title, vendor = EXCLUDED.vendor, updated_at = now()
    RETURNING *`;
  const r = await pool.query(q, [storeId, shopifyProductId, handle || "", title || "", vendor || ""]);
  return r.rows[0];
}

async function upsertVariant({ pool, storeId, productId, shopifyVariantId, size, pricePaise, sku, available, inventoryItemId }) {
  const q = `
    INSERT INTO variants(store_id, product_id, shopify_variant_id, size, price_paise, sku, available, inventory_item_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (store_id, shopify_variant_id)
    DO UPDATE SET product_id = EXCLUDED.product_id, size = EXCLUDED.size, price_paise = EXCLUDED.price_paise, sku = EXCLUDED.sku, available = EXCLUDED.available, inventory_item_id = EXCLUDED.inventory_item_id, updated_at = now()
    RETURNING *`;
  const r = await pool.query(q, [
    storeId,
    productId,
    shopifyVariantId,
    size || "",
    Number.isFinite(pricePaise) ? pricePaise : 0,
    sku || "",
    Boolean(available),
    Number.isFinite(inventoryItemId) ? inventoryItemId : null
  ]);
  return r.rows[0];
}

async function insertDemandEventIdempotent({
  pool,
  storeId,
  productId,
  variantId,
  event,
  eventAt,
  pageUrl,
  pricePaise,
  contactWhatsapp,
  contactEmail,
  userAgent,
  meta,
  idempotencyKey
}) {
  const idem = String(idempotencyKey || "");
  if (!idem) {
    const q = `
      INSERT INTO demand_events(
        store_id, product_id, variant_id, event, event_at, page_url,
        price_paise, contact_whatsapp, contact_email, user_agent, meta
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
      RETURNING *`;
    const r = await pool.query(q, [
      storeId,
      productId || null,
      variantId || null,
      event,
      eventAt,
      pageUrl || "",
      Number.isFinite(pricePaise) ? pricePaise : 0,
      contactWhatsapp || "",
      contactEmail || "",
      userAgent || "",
      JSON.stringify(meta || {})
    ]);
    return r.rows[0] || null;
  }

  const q = `
    INSERT INTO demand_events(
      store_id, product_id, variant_id, event, event_at, page_url,
      price_paise, contact_whatsapp, contact_email, user_agent, meta
      , idempotency_key
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
    ON CONFLICT (store_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL AND idempotency_key <> ''
    DO NOTHING
    RETURNING *`;

  const r = await pool.query(q, [
    storeId,
    productId || null,
    variantId || null,
    event,
    eventAt,
    pageUrl || "",
    Number.isFinite(pricePaise) ? pricePaise : 0,
    contactWhatsapp || "",
    contactEmail || "",
    userAgent || "",
    JSON.stringify(meta || {}),
    idem
  ]);
  if (r.rows[0]) return r.rows[0];
  const existing = await pool.query(
    "SELECT * FROM demand_events WHERE store_id = $1 AND idempotency_key = $2 LIMIT 1",
    [storeId, idem]
  );
  return existing.rows[0] || null;
}

async function insertWaitlist({ pool, storeId, variantId, whatsapp, email, subscribedAt }) {
  const q = `
    INSERT INTO waitlist(store_id, variant_id, whatsapp, email, subscribed_at)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT DO NOTHING
    RETURNING *`;
  const r = await pool.query(q, [storeId, variantId, whatsapp, email || "", subscribedAt]);
  return r.rows[0] || null;
}

async function getVariantByInventoryItem({ pool, storeId, inventoryItemId }) {
  const r = await pool.query(
    "SELECT v.*, p.handle AS product_handle, p.title AS product_title FROM variants v JOIN products p ON p.id = v.product_id WHERE v.store_id = $1 AND v.inventory_item_id = $2 LIMIT 1",
    [storeId, inventoryItemId]
  );
  return r.rows[0] || null;
}

async function upsertInventoryLevel({ pool, storeId, inventoryItemId, locationId, available, inventoryUpdatedAt }) {
  const prev = await pool.query(
    "SELECT available FROM inventory_levels WHERE store_id = $1 AND inventory_item_id = $2 AND location_id = $3",
    [storeId, inventoryItemId, locationId]
  );
  const prevAvailable = prev.rows[0]?.available ?? null;

  const q = `
    INSERT INTO inventory_levels(store_id, inventory_item_id, location_id, available, inventory_updated_at)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (store_id, inventory_item_id, location_id)
    DO UPDATE SET available = EXCLUDED.available, inventory_updated_at = EXCLUDED.inventory_updated_at, updated_at = now()
    RETURNING *`;
  const r = await pool.query(q, [
    storeId,
    inventoryItemId,
    locationId,
    available,
    inventoryUpdatedAt ? new Date(inventoryUpdatedAt).toISOString() : null
  ]);
  return { prevAvailable, row: r.rows[0] };
}

async function listWaitlistForVariant({ pool, storeId, variantDbId }) {
  const r = await pool.query(
    "SELECT * FROM waitlist WHERE store_id = $1 AND variant_id = $2 AND notified_at IS NULL ORDER BY subscribed_at ASC",
    [storeId, variantDbId]
  );
  return r.rows;
}

async function markWaitlistNotified({ pool, storeId, variantDbId, whatsappList, notifiedAt }) {
  if (!Array.isArray(whatsappList) || whatsappList.length === 0) return 0;
  const q = `
    UPDATE waitlist
    SET notified_at = $4
    WHERE store_id = $1 AND variant_id = $2 AND whatsapp = ANY($3::text[]) AND notified_at IS NULL`;
  const r = await pool.query(q, [storeId, variantDbId, whatsappList, notifiedAt]);
  return r.rowCount;
}

async function logMessage({ pool, storeId, toNumber, template, body, provider, status, meta }) {
  const q = `
    INSERT INTO message_logs(store_id, to_number, template, body, provider, status, meta)
    VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
    RETURNING *`;
  const r = await pool.query(q, [
    storeId,
    toNumber,
    template || "",
    body || "",
    provider || "local",
    status || "sent",
    JSON.stringify(meta || {})
  ]);
  return r.rows[0];
}

async function getWidgetSettings({ pool, storeId }) {
  const r = await pool.query("SELECT * FROM widget_settings WHERE store_id = $1", [storeId]);
  const row = r.rows[0] || null;
  if (row) return row;
  return {
    store_id: storeId,
    enabled: true,
    placement: "floating",
    selector: "",
    primary_color: "#111827",
    heading_text: "Get restock alert on WhatsApp",
    button_text: "Notify me",
    consent_text: "I agree to receive restock updates.",
    custom_css: "",
    updated_at: new Date().toISOString()
  };
}

async function upsertWidgetSettings({ pool, storeId, enabled, placement, selector, primaryColor, headingText, buttonText, consentText, customCss }) {
  const q = `
    INSERT INTO widget_settings(
      store_id, enabled, placement, selector, primary_color, heading_text, button_text, consent_text, custom_css
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (store_id)
    DO UPDATE SET
      enabled = EXCLUDED.enabled,
      placement = EXCLUDED.placement,
      selector = EXCLUDED.selector,
      primary_color = EXCLUDED.primary_color,
      heading_text = EXCLUDED.heading_text,
      button_text = EXCLUDED.button_text,
      consent_text = EXCLUDED.consent_text,
      custom_css = EXCLUDED.custom_css,
      updated_at = now()
    RETURNING *`;
  const r = await pool.query(q, [
    storeId,
    Boolean(enabled),
    placement || "floating",
    selector || "",
    primaryColor || "#111827",
    headingText || "Get restock alert on WhatsApp",
    buttonText || "Notify me",
    consentText || "I agree to receive restock updates.",
    customCss || ""
  ]);
  return r.rows[0];
}

async function insertOrder({
  pool,
  storeId,
  shopifyOrderId,
  orderNumber,
  currency,
  totalPricePaise,
  customerEmail,
  customerPhone,
  processedAt,
  meta
}) {
  const q = `
    INSERT INTO orders(
      store_id, shopify_order_id, order_number, currency, total_price_paise,
      customer_email, customer_phone, processed_at, meta
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
    RETURNING *`;
  const r = await pool.query(q, [
    storeId,
    Number.isFinite(shopifyOrderId) ? shopifyOrderId : null,
    orderNumber || "",
    currency || "INR",
    Number.isFinite(totalPricePaise) ? Math.round(totalPricePaise) : 0,
    customerEmail || "",
    customerPhone || "",
    processedAt || null,
    JSON.stringify(meta || {})
  ]);
  return r.rows[0];
}

async function insertOrderLineItems({ pool, storeId, orderId, items }) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const rows = items
    .map(i => ({
      variantId: i.variantId || null,
      quantity: Number.isFinite(i.quantity) && i.quantity > 0 ? Math.round(i.quantity) : 1,
      pricePaise: Number.isFinite(i.pricePaise) ? Math.round(i.pricePaise) : 0,
      title: i.title || ""
    }))
    .slice(0, 200);

  const values = [];
  const params = [];
  let idx = 1;
  for (const r of rows) {
    values.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
    params.push(storeId, orderId, r.variantId, r.quantity, r.pricePaise, r.title);
  }
  const q = `
    INSERT INTO order_line_items(store_id, order_id, variant_id, quantity, price_paise, title)
    VALUES ${values.join(",")}`;
  const res = await pool.query(q, params);
  return res.rowCount;
}

module.exports = {
  upsertStore,
  getStoreByShop,
  logWebhook,
  upsertProduct,
  upsertVariant,
  getVariantByInventoryItem,
  upsertInventoryLevel,
  listWaitlistForVariant,
  markWaitlistNotified,
  insertDemandEventIdempotent,
  insertWaitlist,
  logMessage,
  getWidgetSettings,
  upsertWidgetSettings,
  insertOrder,
  insertOrderLineItems
};
