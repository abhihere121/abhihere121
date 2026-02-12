ALTER TABLE products
  ADD COLUMN IF NOT EXISTS vendor text NOT NULL DEFAULT '';

ALTER TABLE inventory_levels
  ADD COLUMN IF NOT EXISTS inventory_updated_at timestamptz;

UPDATE inventory_levels
SET inventory_updated_at = updated_at
WHERE inventory_updated_at IS NULL;
