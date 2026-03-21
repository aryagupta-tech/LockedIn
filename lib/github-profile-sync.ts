import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { now } from "@/lib/api-utils";
import {
  extractGitHubLoginFromSupabaseUser,
  extractGitHubNumericIdFromSupabaseUser,
} from "@/lib/github-auth-metadata";

type DbUserGithub = { id: string; githubUsername: string | null };

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
  if (dbUser.githubUsername?.trim()) return dbUser;

  let { ghLogin, ghNumericId } = githubFieldsFromAuthUser(authUser);

  // JWT from getUser(access_token) sometimes omits identities / sparse metadata;
  // Auth admin API returns the full user row used at sign-in.
  if (!ghLogin) {
    const { data, error } = await supabase.auth.admin.getUserById(dbUser.id);
    if (!error && data?.user) {
      const again = githubFieldsFromAuthUser(data.user);
      if (again.ghLogin) ghLogin = again.ghLogin;
      if (ghNumericId == null && again.ghNumericId != null) {
        ghNumericId = again.ghNumericId;
      }
    }
  }

  if (!ghLogin && ghNumericId == null) return dbUser;

  const patch: Record<string, unknown> = { updatedAt: now() };
  if (ghLogin) patch.githubUsername = ghLogin;
  if (ghNumericId != null) patch.githubId = ghNumericId;

  await supabase.from("users").update(patch).eq("id", dbUser.id);

  const { data: fresh } = await supabase
    .from("users")
    .select("id, githubUsername")
    .eq("id", dbUser.id)
    .single();

  if (fresh) return fresh as DbUserGithub;
  return { ...dbUser, githubUsername: ghLogin ?? dbUser.githubUsername };
}
