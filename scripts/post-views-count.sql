-- Run once in Supabase → SQL Editor
-- Post view counter + atomic increment (service role only)

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS "viewsCount" integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.lockedin_increment_post_views(p_post_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v int;
BEGIN
  UPDATE public.posts
  SET "viewsCount" = COALESCE("viewsCount", 0) + 1
  WHERE id = p_post_id
  RETURNING "viewsCount" INTO v;
  RETURN COALESCE(v, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.lockedin_increment_post_views(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lockedin_increment_post_views(text) TO service_role;
