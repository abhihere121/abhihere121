-- Migration 006: Persistence for Onboarding Wizard progress
ALTER TABLE stores ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0;
