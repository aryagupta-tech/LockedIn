-- =============================================================================
-- LockedIn — Supabase Setup Script
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- AFTER running: npx prisma db push (from the backend directory)
-- =============================================================================

-- ─── 0. Enable RLS on every public table ────────────────────────────────────
-- All data access goes through the Fastify backend using the service_role key,
-- which bypasses RLS. Enabling RLS with no permissive policies ensures that
-- the PostgREST (anon/authenticated) surface exposes nothing.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END;
$$;

-- 1. Create a storage bucket for avatars (public access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies: allow authenticated users to upload their own avatars
-- (DROP IF EXISTS so re-running this script after a partial run does not error.)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- 3. Seed scoring weights (run only once)
INSERT INTO scoring_weights (id, key, weight, description, threshold, minimum, "updatedAt")
VALUES
  (gen_random_uuid()::text, 'github', 0.45, 'GitHub activity and profile quality', 100, 0, NOW()),
  (gen_random_uuid()::text, 'codeforces', 0.275, 'Codeforces rating and contest participation', 100, 0, NOW()),
  (gen_random_uuid()::text, 'leetcode', 0.275, 'LeetCode problems solved and ranking', 100, 0, NOW())
ON CONFLICT (key) DO NOTHING;
