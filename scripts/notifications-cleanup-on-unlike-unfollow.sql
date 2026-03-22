-- Keep notifications in sync when likes / follows / posts are removed (DB-level).
-- Run in Supabase SQL Editor if triggers drift from supabase-notifications.sql.

-- Unlike: remove like notification by actor + post (works even if post row is already deleted).
CREATE OR REPLACE FUNCTION public.notify_remove_on_unlike()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE type = 'like'
    AND actor_id = OLD."userId"
    AND resource_id = OLD."postId"::text;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_unlike ON public.post_likes;
CREATE TRIGGER trg_notify_unlike
  AFTER DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_remove_on_unlike();

-- Post deleted: drop all like/comment notifications pointing at that post.
CREATE OR REPLACE FUNCTION public.notify_cleanup_post_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE type IN ('like', 'comment')
    AND resource_id = OLD.id::text;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_deleted ON public.posts;
CREATE TRIGGER trg_notify_post_deleted
  AFTER DELETE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_cleanup_post_deleted();

-- Unfollow: remove follow notification.
CREATE OR REPLACE FUNCTION public.notify_remove_on_unfollow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE type = 'follow'
    AND user_id = OLD."followingId"
    AND actor_id = OLD."followerId";

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_unfollow ON public.follows;
CREATE TRIGGER trg_notify_unfollow
  AFTER DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_remove_on_unfollow();
