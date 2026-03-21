-- =============================================================================
-- !!! READ THIS — DO NOT PASTE A FILENAME INTO SUPABASE !!!
-- =============================================================================
-- Supabase SQL Editor runs SQL *code*, not file paths.
-- Typing "scripts/anything.sql" causes: syntax error at or near "scripts"
--
-- WHAT TO DO:
--   1. Open THIS file in Cursor / VS Code (click the file in the sidebar).
--   2. Select ALL text: Ctrl+A (Windows/Linux) or Cmd+A (Mac).
--   3. Copy: Ctrl+C or Cmd+C.
--   4. In browser: Supabase Dashboard → your project → SQL Editor → New query.
--   5. Paste into the empty box → click RUN (or Ctrl+Enter).
-- =============================================================================
-- This single file runs BOTH:
--   Part A — ensure role/status columns on public.users (safe if already there)
--   Part B — RPC + trigger + RLS policy for profile creation / login
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- PART A — fix-users-profile (columns + defaults)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'USER';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING';

UPDATE public.users SET role = 'USER' WHERE role IS NULL;
UPDATE public.users SET status = 'PENDING' WHERE status IS NULL;

ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'USER';
ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'PENDING';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART B — supabase-profile-rls-and-rpc (functions, trigger, policy)
-- ═══════════════════════════════════════════════════════════════════════════

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

DROP POLICY IF EXISTS "lockedin_users_select_own" ON public.users;
CREATE POLICY "lockedin_users_select_own"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- =============================================================================
-- If CREATE TRIGGER failed: try replacing EXECUTE FUNCTION with:
--   EXECUTE PROCEDURE public.lockedin_handle_new_auth_user();
-- =============================================================================
