import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { now } from "@/lib/api-utils";
import { createUserAuthedClient } from "@/lib/supabase-server";

/**
 * Creates `public.users` via SECURITY DEFINER RPC using the logged-in user's JWT.
 * Works even when SUPABASE_SERVICE_ROLE_KEY is wrong (RLS blocks service_role-as-anon inserts).
 * Requires running scripts/supabase-profile-rls-and-rpc.sql once in Supabase.
 */
export async function ensurePublicUserProfileWithUserJwt(
  accessToken: string,
): Promise<string | null> {
  const client = createUserAuthedClient(accessToken);
  const { error } = await client.rpc("lockedin_ensure_my_profile");
  if (!error) return null;

  const msg = error.message || "";
  const code = (error as { code?: string }).code;
  if (
    code === "PGRST202" ||
    msg.includes("Could not find the function") ||
    msg.includes("does not exist")
  ) {
    return (
      "Database function lockedin_ensure_my_profile is missing — run scripts/supabase-profile-rls-and-rpc.sql in the Supabase SQL Editor."
    );
  }
  return msg;
}

/**
 * Ensures `public.users` has a row for this Supabase Auth user.
 * @returns `null` if OK, otherwise a short error message (often the DB/PostgREST error).
 */
export async function ensurePublicUserRow(
  supabase: SupabaseClient,
  authUser: User,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existing) return null;

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

  const newRow: Record<string, unknown> = {
    id: authUser.id,
    email: (authUser.email || `${username}@users.lockedin`).toLowerCase(),
    username,
    displayName: (meta.full_name ||
      meta.name ||
      meta.displayName ||
      username) as string,
    role: "USER",
    status: "PENDING",
    createdAt: ts,
    updatedAt: ts,
  };

  if (meta.avatar_url) {
    newRow.avatarUrl = meta.avatar_url;
  }

  if (providerId !== undefined && providerId !== null) {
    const n = parseInt(String(providerId), 10);
    if (!Number.isNaN(n)) {
      newRow.githubId = n;
    }
  }

  if (meta.user_name) {
    newRow.githubUsername = meta.user_name;
  }

  const { error: insErr } = await supabase.from("users").insert(newRow);

  if (!insErr) {
    return null;
  }

  if (insErr.code === "23505") {
    const { data: again } = await supabase
      .from("users")
      .select("id")
      .eq("id", authUser.id)
      .maybeSingle();
    if (again) return null;
  }

  console.error("ensurePublicUserRow insert failed:", insErr.code, insErr.message, insErr.details);
  return insErr.message || `Insert failed (${insErr.code || "unknown"})`;
}
