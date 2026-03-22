import { supabase } from "./supabase";
import { compressImageToMaxSize } from "./compress-image";
import {
  isAllowedPostImageType,
  AVATAR_IMAGE_MAX_BYTES,
  POST_IMAGE_MAX_BYTES,
} from "./validation";

const AVATAR_BUCKET = "avatars";
const POST_IMAGES_BUCKET = "post-images";

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!isAllowedPostImageType(file.type)) {
    throw new Error("Use JPEG, PNG, WebP, or GIF images only.");
  }
  const prepared = await compressImageToMaxSize(file, AVATAR_IMAGE_MAX_BYTES);
  const ext =
    prepared.type === "image/png"
      ? "png"
      : prepared.type === "image/webp"
        ? "webp"
        : prepared.type === "image/gif"
          ? "gif"
          : "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, prepared, { upsert: true, contentType: prepared.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function getAvatarUrl(path: string): string {
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a post image (client must be signed in). Path: `{userId}/{uuid}.{ext}`
 */
export async function uploadPostImage(userId: string, file: File): Promise<string> {
  if (!isAllowedPostImageType(file.type)) {
    throw new Error("Use JPEG, PNG, WebP, or GIF images only.");
  }
  const prepared = await compressImageToMaxSize(file, POST_IMAGE_MAX_BYTES);
  if (prepared.size > POST_IMAGE_MAX_BYTES) {
    throw new Error("Could not prepare this image. Try a different photo.");
  }

  const ext =
    prepared.type === "image/png"
      ? "png"
      : prepared.type === "image/webp"
        ? "webp"
        : prepared.type === "image/gif"
          ? "gif"
          : "jpg";

  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .upload(path, prepared, { upsert: false, contentType: prepared.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
