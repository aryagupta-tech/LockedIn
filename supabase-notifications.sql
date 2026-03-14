-- =============================================================================
-- LockedIn — Notifications System
-- Run this in Supabase SQL Editor AFTER the main setup script
-- =============================================================================

-- ─── 1. Create notifications table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL,
  type        TEXT NOT NULL,           -- 'like', 'comment', 'follow', 'app_approved', 'app_rejected'
  title       TEXT NOT NULL,
  body        TEXT,
  actor_id    UUID,
  actor_name  TEXT,
  actor_username TEXT,
  resource_id TEXT,                    -- post id, application id, etc.
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
    REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id)
    REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;

-- ─── 2. Enable RLS and add policies ─────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark own notifications as read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── 3. Trigger function: post liked ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  actor_record   RECORD;
BEGIN
  SELECT "authorId" INTO post_author_id FROM public.posts WHERE id = NEW."postId";

  IF post_author_id IS NULL OR post_author_id = NEW."userId" THEN
    RETURN NEW;
  END IF;

  SELECT "displayName", username INTO actor_record
    FROM public.users WHERE id = NEW."userId";

  INSERT INTO public.notifications (user_id, type, title, body, actor_id, actor_name, actor_username, resource_id)
  VALUES (
    post_author_id,
    'like',
    actor_record."displayName" || ' liked your post',
    NULL,
    NEW."userId",
    actor_record."displayName",
    actor_record.username,
    NEW."postId"
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_like ON public.post_likes;
CREATE TRIGGER trg_notify_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- ─── 4. Trigger function: comment on post ────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  actor_record   RECORD;
  post_preview   TEXT;
BEGIN
  SELECT "authorId" INTO post_author_id FROM public.posts WHERE id = NEW."postId";

  IF post_author_id IS NULL OR post_author_id = NEW."authorId" THEN
    RETURN NEW;
  END IF;

  SELECT "displayName", username INTO actor_record
    FROM public.users WHERE id = NEW."authorId";

  post_preview := LEFT(NEW.content, 100);

  INSERT INTO public.notifications (user_id, type, title, body, actor_id, actor_name, actor_username, resource_id)
  VALUES (
    post_author_id,
    'comment',
    actor_record."displayName" || ' commented on your post',
    post_preview,
    NEW."authorId",
    actor_record."displayName",
    actor_record.username,
    NEW."postId"
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_comment ON public.comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- ─── 5. Trigger function: new follower ───────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  actor_record RECORD;
BEGIN
  IF NEW."followerId" = NEW."followingId" THEN
    RETURN NEW;
  END IF;

  SELECT "displayName", username INTO actor_record
    FROM public.users WHERE id = NEW."followerId";

  INSERT INTO public.notifications (user_id, type, title, body, actor_id, actor_name, actor_username, resource_id)
  VALUES (
    NEW."followingId",
    'follow',
    actor_record."displayName" || ' started following you',
    NULL,
    NEW."followerId",
    actor_record."displayName",
    actor_record.username,
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_follow ON public.follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- ─── 6. Enable realtime on notifications table ──────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
