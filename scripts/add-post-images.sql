-- Run in Supabase → SQL Editor (once): post image attachments
-- Adds optional image URL on posts + public storage bucket for uploads.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS "imageUrl" text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users may upload only under their user id folder: {uid}/...
DROP POLICY IF EXISTS "post_images_insert_own" ON storage.objects;
CREATE POLICY "post_images_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "post_images_update_own" ON storage.objects;
CREATE POLICY "post_images_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "post_images_read_public" ON storage.objects;
CREATE POLICY "post_images_read_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'post-images');
