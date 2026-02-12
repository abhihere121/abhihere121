DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'widget_placement') THEN
    CREATE TYPE widget_placement AS ENUM ('floating', 'inline');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS widget_settings (
  store_id uuid PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  placement widget_placement NOT NULL DEFAULT 'floating',
  selector text NOT NULL DEFAULT '',
  primary_color text NOT NULL DEFAULT '#111827',
  heading_text text NOT NULL DEFAULT 'Get restock alert on WhatsApp',
  button_text text NOT NULL DEFAULT 'Notify me',
  consent_text text NOT NULL DEFAULT 'I agree to receive restock updates.',
  custom_css text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shopify_order_id bigint,
  order_number text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'INR',
  total_price_paise bigint NOT NULL DEFAULT 0,
  customer_email text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (store_id, shopify_order_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_store_created_at ON orders(store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES variants(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  price_paise integer NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_line_items_store_variant ON order_line_items(store_id, variant_id);
