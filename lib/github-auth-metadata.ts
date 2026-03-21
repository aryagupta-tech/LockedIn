import type { User } from "@supabase/supabase-js";

/** True if this account uses GitHub OAuth (primary or linked provider). */
export function sessionHasGithubIdentity(user: User): boolean {
  const app = user.app_metadata || {};
  if (app.provider === "github") return true;
  const providers = app.providers;
  if (Array.isArray(providers) && providers.includes("github")) return true;
  return user.identities?.some((i) => i.provider === "github") ?? false;
}

/** GitHub hides real email; login is embedded in the noreply address. */
function githubLoginFromNoreplyEmail(
  email: string | null | undefined,
): string | null {
  if (!email?.trim()) return null;
  const m = email.trim().match(/^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i);
  if (!m) return null;
  return m[1].trim();
}

/**
 * GitHub OAuth login from Supabase Auth user (metadata + identities).
 * Supabase usually sets user_metadata.user_name; some setups use preferred_username or identity_data.
 */
export function extractGitHubLoginFromSupabaseUser(user: User): string | null {
  const meta = user.user_metadata || {};

  const fromMeta = [meta.user_name, meta.preferred_username, meta.login, meta.nickname]
    .find((v) => typeof v === "string" && v.trim().length > 0);
  if (fromMeta) return String(fromMeta).trim();

  const ids = user.identities;
  if (Array.isArray(ids)) {
    for (const ident of ids) {
      if (ident.provider !== "github") continue;
      const d = (ident.identity_data || {}) as Record<string, unknown>;
      const login = [
        d.user_name,
        d.preferred_username,
        d.login,
        d.nickname,
        d.name,
        d.slug,
      ].find((v) => typeof v === "string" && v.trim().length > 0);
      if (login) return String(login).trim();
    }
  }

  if (sessionHasGithubIdentity(user)) {
    const fromEmail = githubLoginFromNoreplyEmail(user.email);
    if (fromEmail) return fromEmail;
  }

  return null;
}

/**
 * Profile image URL from GitHub OAuth. Supabase may use user_metadata.avatar_url,
 * OAuth-standard `picture`, or identities[].identity_data (especially on refresh / PKCE).
 */
export function extractGithubAvatarUrlFromSupabaseUser(user: User): string | null {
  const meta = user.user_metadata || {};
  const fromMeta = [meta.avatar_url, meta.picture, meta.image]
    .find((v) => typeof v === "string" && v.trim().length > 0);
  if (fromMeta) return String(fromMeta).trim();

  const ids = user.identities;
  if (!Array.isArray(ids)) return null;
  for (const ident of ids) {
    if (ident.provider !== "github") continue;
    const d = (ident.identity_data || {}) as Record<string, unknown>;
    const url = [d.avatar_url, d.picture, d.image].find(
      (v) => typeof v === "string" && v.trim().length > 0,
    );
    if (url) return String(url).trim();
  }

  return null;
}

/** GitHub numeric user id from OAuth (for public.users.githubId). */
export function extractGitHubNumericIdFromSupabaseUser(user: User): number | null {
  const meta = user.user_metadata || {};
  if (meta.provider_id != null && meta.provider_id !== "") {
    const n = parseInt(String(meta.provider_id), 10);
    if (!Number.isNaN(n)) return n;
  }

  const ids = user.identities;
  if (!Array.isArray(ids)) return null;
  for (const ident of ids) {
    if (ident.provider !== "github") continue;
    const raw = ident.identity_data as Record<string, unknown> | undefined;
    const idStr = raw?.provider_id ?? raw?.sub;
    if (idStr != null && idStr !== "") {
      const n = parseInt(String(idStr), 10);
      if (!Number.isNaN(n)) return n;
    }
  }

  return null;
}
