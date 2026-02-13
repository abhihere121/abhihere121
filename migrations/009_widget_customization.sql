-- Migration 009: Detailed Widget Customization
ALTER TABLE widget_settings
  ADD COLUMN IF NOT EXISTS success_heading text NOT NULL DEFAULT 'You''re on the list!',
  ADD COLUMN IF NOT EXISTS success_text text NOT NULL DEFAULT 'We''ll notify you as soon as this item is back in stock.',
  ADD COLUMN IF NOT EXISTS show_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_whatsapp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS border_radius integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS font_size integer NOT NULL DEFAULT 14;
