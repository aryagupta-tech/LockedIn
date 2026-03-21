-- Run in Supabase → SQL Editor if `public.users` inserts fail (missing columns / NOT NULL).
-- Adjust to match your actual table (check Table Editor → users → column names).

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS error: "new row violates row-level security policy for table users"
-- ═══════════════════════════════════════════════════════════════════════════
-- Your Next.js API uses PostgREST with SUPABASE_SERVICE_ROLE_KEY. The service_role
-- JWT bypasses RLS. If you see this error from /api/auth/login, Vercel almost
-- certainly has the ANON key in SUPABASE_SERVICE_ROLE_KEY by mistake.
--
-- Fix: Supabase Dashboard → Project Settings → API → copy "service_role" secret
--      (not "anon" / "public") → Vercel → Environment Variables → redeploy.
--
-- Optional one-time fix for an existing Auth user (SQL Editor runs as superuser,
-- so this bypasses RLS). Change the email to match your account:
--
-- INSERT INTO public.users (id, email, username, "displayName", "createdAt", "updatedAt", role, status)
-- SELECT au.id, lower(au.email),
--   regexp_replace(split_part(lower(au.email), '@', 1), '[^a-z0-9_]', '_', 'g'),
--   split_part(au.email, '@', 1), now(), now(), 'USER', 'APPROVED'
-- FROM auth.users au
-- WHERE lower(au.email) = 'you@example.com'
-- ON CONFLICT (id) DO UPDATE SET status = 'APPROVED', "updatedAt" = now();
--
-- LOCKEDIN_SEED_APPROVED_EMAILS / ADMIN only run *after* a profile row exists;
-- they do not fix RLS or create the row.

-- 1) Ensure role + status exist with sane defaults (Prisma-style camelCase names)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'USER';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING';

-- 2) Backfill nulls (if column existed without default)
UPDATE public.users SET role = 'USER' WHERE role IS NULL;
UPDATE public.users SET status = 'PENDING' WHERE status IS NULL;

-- 3) Optional: enforce defaults for future inserts
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'USER';
ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'PENDING';

-- 4) If your columns are snake_case instead (role vs "role"), use Table Editor to confirm.
-- PostgREST / supabase-js must use the same names as in the database.
