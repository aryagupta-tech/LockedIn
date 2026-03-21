import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { now } from "@/lib/api-utils";

/**
 * Ensures `public.users` has a row for this Supabase Auth user.
 * Fixes "User record not found" when JWT is valid but the profile row was never
 * created (OAuth edge cases, failed callback insert, or auth/user drift).
 */
export async function ensurePublicUserRow(
  supabase: SupabaseClient,
  authUser: User,
): Promise<void> {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existing) return;

  const meta = authUser.user_metadata || {};
  let username = (
    meta.user_name ||
    meta.preferred_username ||
    meta.username ||
    authUser.email?.split("@")[0] ||
    "user"
  )
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");
  if (!username) username = "user";

  const { data: taken } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (taken) username = `${username}_${authUser.id.slice(0, 6)}`;

  const ts = now();
  const providerId = meta.provider_id;
  const newRow = {
    id: authUser.id,
    email: (authUser.email || `${username}@users.lockedin`).toLowerCase(),
    username,
    displayName: (meta.full_name ||
      meta.name ||
      meta.displayName ||
      username) as string,
    avatarUrl: (meta.avatar_url as string | undefined) ?? null,
    githubId:
      providerId !== undefined && providerId !== null
        ? parseInt(String(providerId), 10)
        : null,
    githubUsername: (meta.user_name as string | undefined) ?? null,
    createdAt: ts,
    updatedAt: ts,
  };

  const { error: insErr } = await supabase.from("users").insert(newRow);
  if (insErr && insErr.code !== "23505") {
    console.error("ensurePublicUserRow insert:", insErr.message);
  }
  // 23505 = race: another request created the row
}
