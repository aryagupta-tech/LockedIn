/**
 * Shared auth / input validation for API routes and client forms.
 */

/** Practical RFC 5322–style check (not full spec). */
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  const t = email.trim();
  if (t.length < 5 || t.length > 254) return false;
  return EMAIL_RE.test(t);
}

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

export type UsernameValidation =
  | { ok: true; username: string }
  | { ok: false; error: string };

export function validateUsername(raw: string): UsernameValidation {
  const username = raw.trim().toLowerCase();
  if (username.length < 3) {
    return { ok: false, error: "Username must be at least 3 characters." };
  }
  if (username.length > 30) {
    return { ok: false, error: "Username must be at most 30 characters." };
  }
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error:
        "Username can only use lowercase letters, numbers, and underscores (no spaces).",
    };
  }
  return { ok: true, username };
}

export function validatePassword(password: string): string | null {
  if (password.length < 10) {
    return "Password must be at least 10 characters.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return "Password must include at least one special character (e.g. !@#$%^&*).";
  }
  return null;
}

export function validateDisplayName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < 1) return "Display name is required.";
  if (name.length > 80) return "Display name must be at most 80 characters.";
  return null;
}

const POST_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function isAllowedPostImageType(contentType: string): boolean {
  return POST_IMAGE_TYPES.has(contentType);
}

/** Ensure post image URL came from our Supabase public post-images bucket. */
export function isTrustedPostImageUrl(
  url: string,
  supabaseProjectUrl: string,
): boolean {
  try {
    const base = supabaseProjectUrl.replace(/\/+$/, "");
    const prefix = `${base}/storage/v1/object/public/post-images/`;
    return url.startsWith(prefix);
  } catch {
    return false;
  }
}
