-- Run in Supabase → SQL Editor if `public.users` inserts fail (missing columns / NOT NULL).
-- Adjust to match your actual table (check Table Editor → users → column names).

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
