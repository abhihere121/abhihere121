-- Migration 005: RESTIQ Rebrand and Smart Batching Support

DO $$ 
BEGIN
    -- Rename the plan type if it exists under the old name
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sizesignal_plan') THEN
        ALTER TYPE sizesignal_plan RENAME TO restiq_plan;
    END IF;

    -- Create restiq_plan if it doesn't exist (safety for fresh installs)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'restiq_plan') THEN
        CREATE TYPE restiq_plan AS ENUM ('free', 'growth', 'pro');
    END IF;
END $$;

-- Add the unique index for Smart Batching (duplicate protection)
-- This ensures a customer can only subscribe once per variant while waiting
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_variant_whatsapp_active 
ON waitlist (variant_id, whatsapp) 
WHERE notified_at IS NULL;
