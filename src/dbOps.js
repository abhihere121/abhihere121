/**
 * DB Operations for RESTIQ (Growth Phase)
 */

async function getStoreByShop({ pool, shopDomain }) {
  const res = await pool.query("SELECT * FROM stores WHERE shop_domain = $1", [shopDomain]);
  return res.rows[0];
}

async function updateOnboardingStep({ pool, storeId, step }) {
  await pool.query(
    "UPDATE stores SET onboarding_step = $1, updated_at = now() WHERE id = $2",
    [step, storeId]
  );
}

async function upsertProduct({ pool, storeId, shopifyProductId, handle, title, vendor, imageUrl }) {
  const res = await pool.query(`
    INSERT INTO products (store_id, shopify_product_id, handle, title, image_url, updated_at)
    VALUES ($1, $2, $3, $4, $5, now())
    ON CONFLICT (store_id, shopify_product_id) DO UPDATE SET
      handle = EXCLUDED.handle,
      title = EXCLUDED.title,
      image_url = EXCLUDED.image_url,
      updated_at = now()
    RETURNING *
  `, [storeId, shopifyProductId, handle, title, imageUrl]);
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
  // Translate Shopify IDs (if provided) to internal UUIDs
  // In Growth phase, we use bigint for shopify IDs.
  // We join with products/variants tables to get internal UUIDs.
  const query = `
    INSERT INTO demand_events (
      store_id, product_id, variant_id, event, event_at, page_url, 
      price_paise, contact_whatsapp, contact_email, user_agent, meta,
      idempotency_key
    ) 
    SELECT 
      $1, p.id, v.id, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12
    FROM (SELECT $1::uuid as sid) s
    LEFT JOIN products p ON p.store_id = s.sid AND p.shopify_product_id = $2::bigint
    LEFT JOIN variants v ON v.store_id = s.sid AND v.shopify_variant_id = $3::bigint
    ON CONFLICT (store_id, idempotency_key) WHERE idempotency_key IS NOT NULL AND idempotency_key <> '' DO NOTHING
    RETURNING demand_events.id
  `;
  const res = await pool.query(query, [
    storeId, productId, variantId, event, eventAt, pageUrl,
    pricePaise, contactWhatsapp, contactEmail, userAgent, JSON.stringify(meta || {}),
    idempotencyKey
  ]);
  return res.rows[0];
}

async function insertWaitlist({ pool, storeId, variantId, whatsapp, email, subscribedAt }) {
  const query = `
    INSERT INTO waitlist (store_id, variant_id, whatsapp, email, subscribed_at)
    SELECT $1, v.id, $3, $4, $5
    FROM variants v
    WHERE v.store_id = $1 AND v.shopify_variant_id = $2::bigint
    ON CONFLICT (variant_id, whatsapp) WHERE notified_at IS NULL
    DO UPDATE SET subscribed_at = EXCLUDED.subscribed_at
    RETURNING id
  `;
  const res = await pool.query(query, [storeId, variantId, whatsapp, email, subscribedAt]);
  return res.rows[0];
}

async function getWidgetSettings({ pool, storeId }) {
  const res = await pool.query("SELECT * FROM widget_settings WHERE store_id = $1", [storeId]);
  return res.rows[0];
}

async function upsertWidgetSettings({ pool, storeId, enabled, primary_color, button_text, heading_text, placement, selector, consent_text, custom_css }) {
  const res = await pool.query(`
    INSERT INTO widget_settings (
      store_id, enabled, primary_color, button_text, heading_text, 
      placement, selector, consent_text, custom_css, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
    ON CONFLICT (store_id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      primary_color = EXCLUDED.primary_color,
      button_text = EXCLUDED.button_text,
      heading_text = EXCLUDED.heading_text,
      placement = EXCLUDED.placement,
      selector = EXCLUDED.selector,
      consent_text = EXCLUDED.consent_text,
      custom_css = EXCLUDED.custom_css,
      updated_at = now()
    RETURNING *
  `, [
    storeId,
    enabled ?? true,
    primary_color || '#111827',
    button_text || 'Notify me',
    heading_text || 'Get restock alert',
    placement || 'floating',
    selector || '',
    consent_text || 'I agree to receive restock updates.',
    custom_css || ''
  ]);
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
      p.image_url as product_image,
      v.size,
      COUNT(e.id)::int as demand_count,
      SUM(CASE WHEN e.event = 'oos_visit' THEN e.price_paise ELSE 0 END)::bigint as missed_revenue_paise,
      (SELECT available FROM variants v2 WHERE v2.id = v.id) as is_available
    FROM variants v
    JOIN products p ON p.id = v.product_id
    LEFT JOIN demand_events e ON e.variant_id = v.id AND e.event_at >= $1
    WHERE v.store_id = $2
    GROUP BY v.id, p.title, p.handle, p.image_url, v.size
    HAVING COUNT(e.id) > 0
    ORDER BY demand_count DESC
    LIMIT 10
  `, [since, storeId]);

  return {
    missedRevenuePaise: Number(missedRes.rows[0]?.total || 0),
    customersWaiting: Number(waitingRes.rows[0]?.total || 0),
    recoveredRevenuePaise: Number(recoveredRes.rows[0]?.total || 0),
    demandByVariant: topVariantsRes.rows.map(r => ({
      variantId: r.variant_db_id,
      productTitle: r.product_title,
      productHandle: r.product_handle,
      productImage: r.product_image,
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

async function getIntegrationSettings({ pool, storeId }) {
  const res = await pool.query("SELECT * FROM integration_settings WHERE store_id = $1", [storeId]);
  return res.rows[0];
}

async function upsertIntegrationSettings({ pool, storeId, settings }) {
  const query = `
    INSERT INTO integration_settings (
      store_id, 
      whatsapp_enabled, whatsapp_provider, whatsapp_sid, whatsapp_token, whatsapp_from,
      klaviyo_enabled, klaviyo_api_key, klaviyo_list_id,
      smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (store_id) DO UPDATE SET
      whatsapp_enabled = EXCLUDED.whatsapp_enabled,
      whatsapp_provider = EXCLUDED.whatsapp_provider,
      whatsapp_sid = EXCLUDED.whatsapp_sid,
      whatsapp_token = EXCLUDED.whatsapp_token,
      whatsapp_from = EXCLUDED.whatsapp_from,
      klaviyo_enabled = EXCLUDED.klaviyo_enabled,
      klaviyo_api_key = EXCLUDED.klaviyo_api_key,
      klaviyo_list_id = EXCLUDED.klaviyo_list_id,
      smtp_enabled = EXCLUDED.smtp_enabled,
      smtp_host = EXCLUDED.smtp_host,
      smtp_port = EXCLUDED.smtp_port,
      smtp_user = EXCLUDED.smtp_user,
      smtp_pass = EXCLUDED.smtp_pass,
      smtp_from = EXCLUDED.smtp_from,
      updated_at = now()
    RETURNING *
  `;
  const res = await pool.query(query, [
    storeId,
    settings.whatsapp_enabled || false,
    settings.whatsapp_provider || 'twilio',
    settings.whatsapp_sid || '',
    settings.whatsapp_token || '',
    settings.whatsapp_from || '',
    settings.klaviyo_enabled || false,
    settings.klaviyo_api_key || '',
    settings.klaviyo_list_id || '',
    settings.smtp_enabled || false,
    settings.smtp_host || '',
    settings.smtp_port || 587,
    settings.smtp_user || '',
    settings.smtp_pass || '',
    settings.smtp_from || ''
  ]);
  return res.rows[0];
}

async function toggleVariantAvailability({ pool, storeId, variantDbId }) {
  await pool.query(
    "UPDATE variants SET available = NOT available, updated_at = now() WHERE id = $1 AND store_id = $2",
    [variantDbId, storeId]
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
  updateOnboardingStep,
  listWaitlistForVariant,
  markWaitlistNotified,
  getDashboardMetrics,
  logWebhook,
  getIntegrationSettings,
  upsertIntegrationSettings,
  toggleVariantAvailability
};
