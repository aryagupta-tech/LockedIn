-- One-time: give an existing Supabase Auth user a `public.users` row + full access.
-- 1) Dashboard → Authentication → Users → copy User UID for your test account
-- 2) Replace :user_id below (or use the email match variant if your schema allows).

-- Option A — you know the auth user UUID:
-- INSERT INTO public.users (id, email, username, "displayName", "avatarUrl", "githubId", "githubUsername", role, status, "createdAt", "updatedAt")
-- VALUES (
--   'PASTE_AUTH_USER_UUID',
--   'you@example.com',
--   'test',
--   'Test User',
--   null,
--   null,
--   null,
--   'ADMIN',
--   'APPROVED',
--   now(),
--   now()
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   status = 'APPROVED',
--   role = 'ADMIN',
--   "updatedAt" = now();

-- Option B — sync from auth.users (Postgres, Supabase):
INSERT INTO public.users (id, email, username, "displayName", "createdAt", "updatedAt", role, status)
SELECT
  au.id,
  lower(au.email),
  regexp_replace(split_part(lower(au.email), '@', 1), '[^a-z0-9_]', '_', 'g'),
  split_part(au.email, '@', 1),
  now(),
  now(),
  'ADMIN',
  'APPROVED'
FROM auth.users au
WHERE lower(au.email) = 'you@example.com'
ON CONFLICT (id) DO UPDATE SET
  status = 'APPROVED',
  role = 'ADMIN',
  "updatedAt" = now();
