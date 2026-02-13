/**
 * DB Operations for RESTIQ (Growth Phase)
 */

async function getStoreByShop({ pool, shopDomain }) {
  const res = await pool.query("SELECT * FROM stores WHERE shop_domain = $1", [shopDomain]);
  return res.rows[0];
}

async function upsertProduct({ pool, storeId, shopifyProductId, handle, title, vendor }) {
  const res = await pool.query(`
    INSERT INTO products (store_id, shopify_product_id, handle, title, updated_at)
    VALUES ($1, $2, $3, $4, now())
    ON CONFLICT (store_id, shopify_product_id) DO UPDATE SET
      handle = EXCLUDED.handle,
      title = EXCLUDED.title,
      updated_at = now()
    RETURNING *
  `, [storeId, shopifyProductId, handle, title]);
  return res.rows[0];
}

async function upsertVariant({ pool, storeId, productId, shopifyVariantId, size, pricePaise, sku, available, inventoryItemId }) {
  const res = await pool.query(`
    INSERT INTO variants (store_id, product_id, shopify_variant_id, size, price_paise, sku, available, inventory_item_id, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
    ON CONFLICT (store_id, shopify_variant_id) DO UPDATE SET
      size = EXCLUDED.size,
      price_paise = EXCLUDED.price_paise,
      sku = EXCLUDED.sku,
      available = EXCLUDED.available,
      inventory_item_id = EXCLUDED.inventory_item_id,
      updated_at = now()
    RETURNING *
  `, [storeId, productId, shopifyVariantId, size, pricePaise, sku, available, inventoryItemId]);
  return res.rows[0];
}

async function insertDemandEventIdempotent({ pool, storeId, productId, variantId, event, eventAt, pageUrl, pricePaise, contactWhatsapp, contactEmail, userAgent, meta, idempotencyKey }) {
  // Simulating idempotency or just inserting for now
  const query = `
    INSERT INTO demand_events (
      store_id, product_id, variant_id, event, event_at, page_url, 
      price_paise, contact_whatsapp, contact_email, user_agent, meta
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
    RETURNING id
  `;
  const res = await pool.query(query, [
    storeId, productId, variantId, event, eventAt, pageUrl,
    pricePaise, contactWhatsapp, contactEmail, userAgent, JSON.stringify(meta || {})
  ]);
  return res.rows[0];
}

async function insertWaitlist({ pool, storeId, variantId, whatsapp, email, subscribedAt }) {
  const query = `
    INSERT INTO waitlist (store_id, variant_id, whatsapp, email, subscribed_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
  const res = await pool.query(query, [storeId, variantId, whatsapp, email, subscribedAt]);
  return res.rows[0];
}

async function getWidgetSettings({ pool, storeId }) {
  const res = await pool.query("SELECT * FROM widget_settings WHERE store_id = $1", [storeId]);
  return res.rows[0];
}

async function upsertWidgetSettings({ pool, storeId, enabled, primary_color, button_text, heading_text }) {
  const res = await pool.query(`
    INSERT INTO widget_settings (store_id, enabled, primary_color, button_text, heading_text, updated_at)
    VALUES ($1, $2, $3, $4, $5, now())
    ON CONFLICT (store_id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      primary_color = EXCLUDED.primary_color,
      button_text = EXCLUDED.button_text,
      heading_text = EXCLUDED.heading_text,
      updated_at = now()
    RETURNING *
  `, [storeId, enabled ?? true, primary_color || '#111827', button_text || 'Notify me', heading_text || 'Get restock alert']);
  return res.rows[0];
}

async function listWaitlistForVariant({ pool, storeId, variantDbId, limit }) {
  const query = `
    SELECT * FROM waitlist 
    WHERE store_id = $1 AND variant_id = $2 AND notified_at IS NULL
    ORDER BY subscribed_at ASC
    ${limit ? `LIMIT ${Number(limit)}` : ""}
  `;
  const res = await pool.query(query, [storeId, variantDbId]);
  return res.rows;
}

async function markWaitlistNotified({ pool, storeId, variantDbId, whatsappList, notifiedAt }) {
  if (!whatsappList || whatsappList.length === 0) return;
  await pool.query(
    "UPDATE waitlist SET notified_at = $1 WHERE store_id = $2 AND variant_id = $3 AND whatsapp = ANY($4)",
    [notifiedAt, storeId, variantDbId, whatsappList]
  );
}

async function getDashboardMetrics({ pool, storeId, days = 7 }) {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // 1. Missed Revenue
  const missedRes = await pool.query(
    "SELECT SUM(price_paise)::bigint as total FROM demand_events WHERE store_id = $1 AND event = 'oos_visit' AND event_at >= $2",
    [storeId, since]
  );

  // 2. Customers Waiting
  const waitingRes = await pool.query(
    "SELECT COUNT(*)::int as total FROM waitlist WHERE store_id = $1 AND notified_at IS NULL",
    [storeId]
  );

  // 3. Recovered Revenue (Attributed)
  // Logic: Orders for a variant that were placed AFTER a user was notified for that same variant
  const recoveredRes = await pool.query(`
    SELECT SUM(oli.price_paise * oli.quantity)::bigint as total
    FROM order_line_items oli
    JOIN orders o ON o.id = oli.order_id
    JOIN waitlist w ON w.variant_id = oli.variant_id AND (w.email = o.customer_email OR w.whatsapp = o.customer_phone)
    WHERE oli.store_id = $1 
      AND w.notified_at IS NOT NULL 
      AND o.created_at > w.notified_at
      AND o.created_at >= $2
  `, [storeId, since]);

  // 4. Top Variants
  const topVariantsRes = await pool.query(`
    SELECT
      v.id as variant_db_id,
      p.title as product_title,
      p.handle as product_handle,
      v.size,
      COUNT(e.id)::int as demand_count,
      SUM(CASE WHEN e.event = 'oos_visit' THEN e.price_paise ELSE 0 END)::bigint as missed_revenue_paise,
      (SELECT available FROM variants v2 WHERE v2.id = v.id) as is_available
    FROM variants v
    JOIN products p ON p.id = v.product_id
    LEFT JOIN demand_events e ON e.variant_id = v.id AND e.event_at >= $1
    WHERE v.store_id = $2
    GROUP BY v.id, p.title, p.handle, v.size
    HAVING COUNT(e.id) > 0
    ORDER BY demand_count DESC
    LIMIT 10
  `, [since, storeId]);

  return {
    missedRevenuePaise: Number(missedRes.rows[0]?.total || 0),
    customersWaiting: Number(waitingRes.rows[0]?.total || 0),
    recoveredRevenuePaise: Number(recoveredRes.rows[0]?.total || 0),
    demandByVariant: topVariantsRes.rows.map(r => ({
      productTitle: r.product_title,
      productHandle: r.product_handle,
      size: r.size,
      demandCount: r.demand_count,
      missedRevenuePaise: Number(r.missed_revenue_paise || 0),
      isAvailable: r.is_available
    }))
  };
}

async function logWebhook({ pool, storeId, topic, shopDomain, webhookId, payload }) {
  await pool.query(
    "INSERT INTO webhook_logs (store_id, topic, shop_domain, webhook_id, payload) VALUES ($1,$2,$3,$4,$5::jsonb)",
    [storeId, topic, shopDomain, webhookId, JSON.stringify(payload)]
  );
}

module.exports = {
  getStoreByShop,
  upsertProduct,
  upsertVariant,
  insertDemandEventIdempotent,
  insertWaitlist,
  getWidgetSettings,
  upsertWidgetSettings,
  listWaitlistForVariant,
  markWaitlistNotified,
  getDashboardMetrics,
  logWebhook
};
