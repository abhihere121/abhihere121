CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'restiq_plan') THEN
    CREATE TYPE restiq_plan AS ENUM ('free', 'growth', 'pro');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'demand_event_type') THEN
    CREATE TYPE demand_event_type AS ENUM ('variant_view', 'oos_visit', 'notify_intent', 'bounce', 'restock_broadcast');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain text NOT NULL UNIQUE,
  access_token_enc text NOT NULL,
  plan restiq_plan NOT NULL DEFAULT 'free',
  installed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shopify_product_id bigint NOT NULL,
  handle text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, shopify_product_id)
);

CREATE TABLE IF NOT EXISTS variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shopify_variant_id bigint NOT NULL,
  size text NOT NULL DEFAULT '',
  price_paise integer NOT NULL DEFAULT 0,
  sku text NOT NULL DEFAULT '',
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, shopify_variant_id)
);

CREATE TABLE IF NOT EXISTS demand_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES variants(id) ON DELETE SET NULL,
  event demand_event_type NOT NULL,
  event_at timestamptz NOT NULL,
  page_url text NOT NULL DEFAULT '',
  price_paise integer NOT NULL DEFAULT 0,
  contact_whatsapp text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demand_events_store_event_at ON demand_events(store_id, event_at);
CREATE INDEX IF NOT EXISTS idx_demand_events_store_variant_event ON demand_events(store_id, variant_id, event);

CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  whatsapp text NOT NULL,
  email text NOT NULL DEFAULT '',
  subscribed_at timestamptz NOT NULL,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_store_variant ON waitlist(store_id, variant_id);

CREATE TABLE IF NOT EXISTS weekly_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  variant_id uuid NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  oos_visits integer NOT NULL DEFAULT 0,
  notify_intents integer NOT NULL DEFAULT 0,
  missed_revenue_paise bigint NOT NULL DEFAULT 0,
  restock_units integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, week_start, variant_id)
);

CREATE TABLE IF NOT EXISTS message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  to_number text NOT NULL,
  template text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT 'local',
  status text NOT NULL DEFAULT 'sent',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  topic text NOT NULL DEFAULT '',
  shop_domain text NOT NULL DEFAULT '',
  webhook_id text NOT NULL DEFAULT '',
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

