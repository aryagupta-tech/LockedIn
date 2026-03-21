import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { now } from "@/lib/api-utils";
import {
  extractGitHubLoginFromSupabaseUser,
  extractGitHubNumericIdFromSupabaseUser,
} from "@/lib/github-auth-metadata";

export type DbUserGithub = {
  id: string;
  githubUsername: string | null;
  /**
   * When this key is present, we backfill `public.users.githubId` from Auth if it is null.
   * Callers that only pass `id` + `githubUsername` are unchanged (key omitted).
   */
  githubId?: number | null;
};

function coalesceGithubNumericId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * If `public.users.githubUsername` is empty but the Auth user is GitHub OAuth,
 * copy login (and id) from JWT/user metadata into `public.users`.
 * Fixes rows created by DB triggers before callback ran, or legacy callback bugs.
 */
function githubFieldsFromAuthUser(user: User) {
  const raw = extractGitHubLoginFromSupabaseUser(user);
  return {
    ghLogin: raw ? raw.toLowerCase() : null,
    ghNumericId: extractGitHubNumericIdFromSupabaseUser(user),
  };
}

export async function ensureGithubUsernameSyncedFromAuth(
  supabase: SupabaseClient,
  authUser: User,
  dbUser: DbUserGithub,
): Promise<DbUserGithub> {
  const trackGithubId = Object.prototype.hasOwnProperty.call(dbUser, "githubId");
  const needsUsername = !dbUser.githubUsername?.trim();
  const needsGithubId = trackGithubId && coalesceGithubNumericId(dbUser.githubId) == null;

  if (!needsUsername && !needsGithubId) return dbUser;

  let { ghLogin, ghNumericId } = githubFieldsFromAuthUser(authUser);

  // JWT from getUser(access_token) sometimes omits identities / sparse metadata;
  // Auth admin API returns the full user row used at sign-in.
  const needAdmin = (needsUsername && !ghLogin) || (needsGithubId && ghNumericId == null);
  if (needAdmin) {
    const { data, error } = await supabase.auth.admin.getUserById(dbUser.id);
    if (!error && data?.user) {
      const again = githubFieldsFromAuthUser(data.user);
      if (!ghLogin && again.ghLogin) ghLogin = again.ghLogin;
      if (ghNumericId == null && again.ghNumericId != null) {
        ghNumericId = again.ghNumericId;
      }
    }
  }

  const patch: Record<string, unknown> = { updatedAt: now() };
  if (needsUsername && ghLogin) patch.githubUsername = ghLogin;
  if (needsGithubId && ghNumericId != null) patch.githubId = ghNumericId;

  if (Object.keys(patch).length === 1) return dbUser;

  await supabase.from("users").update(patch).eq("id", dbUser.id);

  const { data: fresh } = await supabase
    .from("users")
    .select("id, githubUsername, githubId")
    .eq("id", dbUser.id)
    .single();

  if (fresh) {
    const base = { id: fresh.id, githubUsername: fresh.githubUsername };
    if (trackGithubId) {
      return { ...base, githubId: coalesceGithubNumericId(fresh.githubId) };
    }
    return base;
  }
  return {
    ...dbUser,
    githubUsername: ghLogin ?? dbUser.githubUsername,
    ...(trackGithubId && ghNumericId != null ? { githubId: ghNumericId } : {}),
  };
}
