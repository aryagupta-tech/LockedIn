import type { User } from "@supabase/supabase-js";
import { extractGithubAvatarUrlFromSupabaseUser } from "@/lib/github-auth-metadata";

/**
 * Best-effort GitHub avatar for DB sync. Uses JWT/user identities first, then
 * the public GitHub API if we have a login (handles sparse Supabase metadata).
 */
export async function resolveGithubAvatarForUser(
  authUser: User,
  loginHint: string | null | undefined,
): Promise<string | null> {
  const fromSession = extractGithubAvatarUrlFromSupabaseUser(authUser);
  if (fromSession) return fromSession;

  const login = loginHint?.trim();
  if (!login) return null;

  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(login)}`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "LockedIn-OAuth-Avatar-Sync",
        },
      },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { avatar_url?: string };
    return typeof j.avatar_url === "string" && j.avatar_url.trim() ? j.avatar_url.trim() : null;
  } catch {
    return null;
  }
}
