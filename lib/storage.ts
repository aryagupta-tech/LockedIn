import { supabase } from "./supabase";
import {
  isAllowedPostImageType,
  POST_IMAGE_MAX_BYTES,
} from "./validation";

const AVATAR_BUCKET = "avatars";
const POST_IMAGES_BUCKET = "post-images";

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

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
  if (file.size > POST_IMAGE_MAX_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";

  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
