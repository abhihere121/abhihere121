-- Migration 010: Integration Settings
CREATE TABLE IF NOT EXISTS integration_settings (
  store_id uuid PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  
  -- WhatsApp (Twilio/Official)
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  whatsapp_provider text NOT NULL DEFAULT 'twilio',
  whatsapp_sid text NOT NULL DEFAULT '',
  whatsapp_token text NOT NULL DEFAULT '',
  whatsapp_from text NOT NULL DEFAULT '',
  
  -- Klaviyo
  klaviyo_enabled boolean NOT NULL DEFAULT false,
  klaviyo_api_key text NOT NULL DEFAULT '',
  klaviyo_list_id text NOT NULL DEFAULT '',
  
  -- SMTP / Email
  smtp_enabled boolean NOT NULL DEFAULT false,
  smtp_host text NOT NULL DEFAULT '',
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_user text NOT NULL DEFAULT '',
  smtp_pass text NOT NULL DEFAULT '',
  smtp_from text NOT NULL DEFAULT '',
  
  updated_at timestamptz NOT NULL DEFAULT now()
);
