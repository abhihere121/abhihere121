-- Migration 007: Make contact fields nullable in demand_events
ALTER TABLE demand_events ALTER COLUMN contact_whatsapp DROP NOT NULL;
ALTER TABLE demand_events ALTER COLUMN contact_email DROP NOT NULL;
