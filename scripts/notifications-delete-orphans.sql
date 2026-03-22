-- One-time cleanup: remove like/comment notifications whose post no longer exists.
-- Run in Supabase SQL Editor after deploying trigger/API fixes.

DELETE FROM public.notifications n
WHERE n.type IN ('like', 'comment')
  AND n.resource_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id::text = n.resource_id
  );
