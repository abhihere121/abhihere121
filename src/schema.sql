-- Events Table (Analytics & Demand)
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  variant_id TEXT,
  product_id TEXT,
  product_handle TEXT,
  size_option TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  page_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  meta_json TEXT -- For extra fields like dwell_ms, repeat_count
);

-- Waitlist Table (Notify Me Intents)
CREATE TABLE IF NOT EXISTS waitlist (
  id SERIAL PRIMARY KEY,
  variant_id TEXT NOT NULL,
  product_id TEXT,
  product_handle TEXT,
  size_option TEXT,
  email TEXT,
  whatsapp TEXT,
  status TEXT DEFAULT 'pending', -- pending, notified, purchased
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notified_at TIMESTAMP
);

-- Shops Table (Configuration)
CREATE TABLE IF NOT EXISTS shops (
  domain TEXT PRIMARY KEY,
  access_token TEXT,
  scope TEXT,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  settings_json TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_variant ON events(variant_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_variant ON waitlist(variant_id);
