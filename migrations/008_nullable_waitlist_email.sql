-- Migration 008: Make email nullable in waitlist
ALTER TABLE waitlist ALTER COLUMN email DROP NOT NULL;
