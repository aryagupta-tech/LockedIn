-- Run in Supabase SQL editor if `applications.codolioProfile` is missing.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "codolioProfile" text;
