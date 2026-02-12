DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE job_status AS ENUM ('queued', 'processing', 'done', 'failed');
  END IF;
END$$;

ALTER TABLE demand_events
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_demand_events_idempotency
  ON demand_events(store_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

ALTER TABLE variants
  ADD COLUMN IF NOT EXISTS inventory_item_id bigint;

CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_inventory_item
  ON variants(store_id, inventory_item_id)
  WHERE inventory_item_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS inventory_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  inventory_item_id bigint NOT NULL,
  location_id bigint NOT NULL,
  available integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, inventory_item_id, location_id)
);

CREATE TABLE IF NOT EXISTS webhook_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  shop_domain text NOT NULL DEFAULT '',
  topic text NOT NULL DEFAULT '',
  webhook_id text NOT NULL DEFAULT '',
  status job_status NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  last_error text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_jobs_status_available
  ON webhook_jobs(status, available_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_jobs_dedup
  ON webhook_jobs(shop_domain, webhook_id)
  WHERE webhook_id <> '';

ALTER TABLE webhook_logs
  ADD COLUMN IF NOT EXISTS webhook_id_dedup text;

UPDATE webhook_logs
SET webhook_id_dedup = webhook_id
WHERE webhook_id_dedup IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_logs_dedup
  ON webhook_logs(shop_domain, webhook_id)
  WHERE webhook_id <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_unique
  ON waitlist(store_id, variant_id, whatsapp)
  WHERE whatsapp <> '';

