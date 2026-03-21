-- Run in Supabase → SQL Editor if login fails with:
--   duplicate key value violates unique constraint "users_email_key"
--
-- Meaning: public.users still has your email on an OLD user id (Auth account was
-- deleted/recreated). Change the email if needed, then Run.

-- Example for test@lockedin.dev:
DELETE FROM public.users pu
WHERE lower(trim(COALESCE(pu.email, ''))) = lower('test@lockedin.dev')
  AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pu.id);

-- After this, log in again (or re-run scripts/supabase-profile-rls-and-rpc.sql
-- so lockedin_sync_profile_from_auth auto-removes orphans next time).
