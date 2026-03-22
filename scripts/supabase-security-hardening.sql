-- =============================================================================
-- LockedIn — Supabase hardening (run in SQL Editor after your main setup scripts)
-- =============================================================================
-- Goals:
--   1) Ensure RLS is ON for every public table that holds app data.
--   2) Strip dangerous privileges from anon/authenticated where they are not needed.
--   3) Keep RPCs callable only by roles you intend (usually service_role + specific RPCs for authenticated).
--
-- Test in a staging project first. Wrong REVOKEs can break auth or the dashboard.
-- =============================================================================

-- ─── 1) Enable RLS on all public tables (idempotent) ─────────────────────────
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

-- ─── 2) Notifications: no direct INSERT/DELETE from clients (triggers + service_role only) ─
-- RLS already limits SELECT/UPDATE to own rows (see supabase-notifications.sql).
REVOKE INSERT, DELETE ON public.notifications FROM anon;
REVOKE INSERT, DELETE ON public.notifications FROM authenticated;

-- ─── 3) Verify (read-only): tables missing RLS ───────────────────────────────
-- Run this SELECT manually; every app table should show relrowsecurity = true.
-- SELECT c.relname, c.relrowsecurity AS rls_on
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relkind = 'r'
-- ORDER BY c.relname;

-- ─── 4) Verify (read-only): policies on public tables ─────────────────────
-- SELECT schemaname, tablename, policyname, roles, cmd
-- FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- ─── 5) Realtime (optional) ────────────────────────────────────────────────
-- If you use postgres_changes on notifications in the browser, the table must be
-- in the supabase_realtime publication and RLS must apply to replication.
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ─── 6) RPC hygiene ──────────────────────────────────────────────────────────
-- Dangerous functions should use:
--   REVOKE ALL ON FUNCTION public.your_fn(...) FROM PUBLIC;
--   GRANT EXECUTE ON FUNCTION public.your_fn(...) TO service_role;
-- (See scripts/post-views-count.sql, post-bookmarks-and-counters.sql, supabase-profile-rls-and-rpc.sql.)
