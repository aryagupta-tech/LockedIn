-- Run once in Supabase → SQL Editor
-- 1) Bookmarks (saved posts)
-- 2) Fast atomic counters for likes/comments (avoids COUNT(*) on every action)

-- ─── Bookmarks ─────────────────────────────────────────────────────────────
-- No FKs: id column types vary by project (uuid vs text); API enforces integrity.
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  id text PRIMARY KEY,
  "postId" text NOT NULL,
  "userId" text NOT NULL,
  "createdAt" timestamptz NOT NULL,
  UNIQUE ("postId", "userId")
);

CREATE INDEX IF NOT EXISTS post_bookmarks_user_created
  ON public.post_bookmarks ("userId", "createdAt" DESC);

ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

-- ─── Counter bumps (called from API with service role) ─────────────────────
CREATE OR REPLACE FUNCTION public.lockedin_bump_post_likes(p_post_id text, p_delta integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts
  SET
    "likesCount" = GREATEST(0, COALESCE("likesCount", 0) + p_delta),
    "updatedAt" = now()
  WHERE id = p_post_id;
$$;

REVOKE ALL ON FUNCTION public.lockedin_bump_post_likes(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lockedin_bump_post_likes(text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.lockedin_bump_post_comments(p_post_id text, p_delta integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts
  SET
    "commentsCount" = GREATEST(0, COALESCE("commentsCount", 0) + p_delta),
    "updatedAt" = now()
  WHERE id = p_post_id;
$$;

REVOKE ALL ON FUNCTION public.lockedin_bump_post_comments(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lockedin_bump_post_comments(text, integer) TO service_role;
