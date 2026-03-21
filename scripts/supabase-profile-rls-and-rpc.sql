-- =============================================================================
-- HOW TO RUN (not the filename — copy ALL lines from this file into Supabase)
-- =============================================================================
-- Do NOT paste: scripts/supabase-profile-rls-and-rpc.sql  ← that causes:
--   ERROR: syntax error at or near "scripts"
-- Open this file in your editor → Ctrl+A / Cmd+A → Copy → Supabase SQL Editor → Paste → Run
-- Or use one combined file: COPY-PASTE-INTO-SUPABASE-SQL-EDITOR.sql
-- =============================================================================
-- LockedIn — Profile row without relying on service_role PostgREST bypass
-- Run once in Supabase → SQL Editor (fixes "row violates RLS" on public.users)
-- =============================================================================
-- Creates:
--   1) lockedin_sync_profile_from_auth(uuid) — SECURITY DEFINER insert from auth.users
--   2) lockedin_ensure_my_profile() — RPC; caller must be authenticated (JWT)
--   3) Trigger on auth.users — new signups get a public.users row automatically
--   4) RLS policy — authenticated users can SELECT their own row (for login read)
--
-- If your table uses different column names, adjust the INSERT to match
-- Table Editor → public.users (camelCase columns must be quoted).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.lockedin_sync_profile_from_auth(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  u auth.users%ROWTYPE;
  meta jsonb;
  base_username text;
  final_username text;
  disp text;
  ts timestamptz := now();
BEGIN
  SELECT * INTO u FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RETURN;
  END IF;

  meta := COALESCE(u.raw_user_meta_data, '{}'::jsonb);

  base_username := lower(regexp_replace(
    COALESCE(
      NULLIF(trim(meta->>'username'), ''),
      NULLIF(trim(meta->>'user_name'), ''),
      NULLIF(trim(meta->>'preferred_username'), ''),
      split_part(lower(COALESCE(u.email, '')), '@', 1),
      'user'
    ),
    '[^a-z0-9_]', '_', 'g'
  ));

  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user';
  END IF;

  final_username := base_username;
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE username = final_username AND id IS DISTINCT FROM p_user_id
  ) THEN
    final_username := base_username || '_' || left(replace(p_user_id::text, '-', ''), 6);
  END IF;

  disp := COALESCE(
    NULLIF(trim(meta->>'displayName'), ''),
    NULLIF(trim(meta->>'full_name'), ''),
    NULLIF(trim(meta->>'name'), ''),
    final_username
  );

  INSERT INTO public.users (
    id,
    email,
    username,
    "displayName",
    role,
    status,
    "createdAt",
    "updatedAt"
  ) VALUES (
    u.id,
    lower(COALESCE(u.email, final_username || '@users.lockedin')),
    final_username,
    disp,
    'USER',
    'PENDING',
    ts,
    ts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lockedin_sync_profile_from_auth(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.lockedin_ensure_my_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  PERFORM public.lockedin_sync_profile_from_auth(auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.lockedin_ensure_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lockedin_ensure_my_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.lockedin_handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public.lockedin_sync_profile_from_auth(NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'lockedin_handle_new_auth_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lockedin_on_auth_user_created ON auth.users;
CREATE TRIGGER lockedin_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.lockedin_handle_new_auth_user();

-- Let logged-in users read their own profile (needed after RPC when service_role is wrong)
DROP POLICY IF EXISTS "lockedin_users_select_own" ON public.users;
CREATE POLICY "lockedin_users_select_own"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
