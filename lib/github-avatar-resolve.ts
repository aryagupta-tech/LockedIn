import type { User } from "@supabase/supabase-js";
import { extractGithubAvatarUrlFromSupabaseUser } from "@/lib/github-auth-metadata";

/** Public CDN URL; works without GitHub API auth and avoids REST rate limits. */
export function githubAvatarUrlFromNumericId(githubUserId: number): string {
  return `https://avatars.githubusercontent.com/u/${githubUserId}?v=4`;
}

function coalesceGithubNumericId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Best-effort GitHub avatar for DB sync. Uses JWT/user identities first, then
 * GitHub's avatar CDN when we have the numeric user id from OAuth, then the
 * public REST API by login (handles sparse Supabase metadata / API limits).
 */
export async function resolveGithubAvatarForUser(
  authUser: User,
  loginHint: string | null | undefined,
  githubNumericId?: number | null,
): Promise<string | null> {
  const fromSession = extractGithubAvatarUrlFromSupabaseUser(authUser);
  if (fromSession) return fromSession;

  const id = coalesceGithubNumericId(githubNumericId);
  if (id != null) {
    return githubAvatarUrlFromNumericId(id);
  }

  const login = loginHint?.trim();
  if (!login) return null;

  const token = process.env.GITHUB_TOKEN?.trim();
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(login)}`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "LockedIn-OAuth-Avatar-Sync",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { avatar_url?: string; id?: number };
    const url =
      typeof j.avatar_url === "string" && j.avatar_url.trim() ? j.avatar_url.trim() : null;
    if (url) return url;
    const restId = coalesceGithubNumericId(j.id);
    return restId != null ? githubAvatarUrlFromNumericId(restId) : null;
  } catch {
    return null;
  }
}
