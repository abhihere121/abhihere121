async function enqueueWebhookJob({ pool, storeId, shopDomain, topic, webhookId, payload }) {
  const q = `
    INSERT INTO webhook_jobs(store_id, shop_domain, topic, webhook_id, payload)
    VALUES ($1,$2,$3,$4,$5::jsonb)
    ON CONFLICT (shop_domain, webhook_id)
    DO NOTHING
    RETURNING *`;
  const r = await pool.query(q, [
    storeId || null,
    shopDomain || "",
    topic || "",
    webhookId || "",
    JSON.stringify(payload || {})
  ]);
  return r.rows[0] || null;
}

async function claimJobs({ pool, limit }) {
  const q = `
    WITH cte AS (
      SELECT id
      FROM webhook_jobs
      WHERE status = 'queued' AND available_at <= now()
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT $1
    )
    UPDATE webhook_jobs
    SET status = 'processing', attempts = attempts + 1, updated_at = now()
    FROM cte
    WHERE webhook_jobs.id = cte.id
    RETURNING webhook_jobs.*`;
  const r = await pool.query(q, [Math.max(1, Math.min(50, Number(limit) || 10))]);
  return r.rows;
}

async function markJobDone({ pool, jobId }) {
  await pool.query("UPDATE webhook_jobs SET status = 'done', updated_at = now() WHERE id = $1", [jobId]);
}

async function markJobFailed({ pool, jobId, error, backoffSeconds, maxAttempts }) {
  const msg = String(error || "");
  const backoff = Number.isFinite(backoffSeconds) ? backoffSeconds : 30;
  const max = Number.isFinite(maxAttempts) ? maxAttempts : 10;
  const q = `
    UPDATE webhook_jobs
    SET
      status = CASE WHEN attempts >= $2 THEN 'failed' ELSE 'queued' END,
      last_error = $3,
      available_at = CASE WHEN attempts >= $2 THEN available_at ELSE (now() + ($4 || ' seconds')::interval) END,
      updated_at = now()
    WHERE id = $1`;
  await pool.query(q, [jobId, max, msg.slice(0, 1000), String(backoff)]);
}

module.exports = { enqueueWebhookJob, claimJobs, markJobDone, markJobFailed };

