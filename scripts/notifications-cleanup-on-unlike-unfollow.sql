-- Optional: keep notifications in sync when rows are removed outside the app API.
-- The API already deletes matching rows on unlike / unfollow; run this if you rely on DB triggers only.

CREATE OR REPLACE FUNCTION public.notify_remove_on_unlike()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id uuid;
BEGIN
  SELECT "authorId" INTO post_author_id FROM public.posts WHERE id = OLD."postId";
  IF post_author_id IS NULL THEN
    RETURN OLD;
  END IF;

  DELETE FROM public.notifications
  WHERE type = 'like'
    AND user_id = post_author_id
    AND actor_id = OLD."userId"
    AND resource_id = OLD."postId";

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_unlike ON public.post_likes;
CREATE TRIGGER trg_notify_unlike
  AFTER DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_remove_on_unlike();

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
