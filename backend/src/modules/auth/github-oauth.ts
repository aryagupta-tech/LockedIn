import { getConfig } from "../../config";

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  bio: string | null;
}

export function buildGitHubAuthUrl(state?: string): string {
  const cfg = getConfig();
  const params = new URLSearchParams({
    client_id: cfg.GITHUB_CLIENT_ID,
    redirect_uri: cfg.GITHUB_CALLBACK_URL,
    scope: "read:user user:email",
    ...(state && { state }),
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeGitHubCode(
  code: string,
): Promise<string> {
  const cfg = getConfig();
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: cfg.GITHUB_CLIENT_ID,
      client_secret: cfg.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: cfg.GITHUB_CALLBACK_URL,
    }),
  });

  if (!res.ok) throw new Error(`GitHub token exchange failed: ${res.status}`);

  const data = (await res.json()) as GitHubTokenResponse;
  if (!data.access_token) {
    throw new Error("GitHub did not return an access token");
  }
  return data.access_token;
}

export async function fetchGitHubUser(
  accessToken: string,
): Promise<GitHubUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) throw new Error(`GitHub user fetch failed: ${res.status}`);
  return res.json() as Promise<GitHubUser>;
}

/** Fetch primary verified email if the user.email is null. */
export async function fetchGitHubEmail(
  accessToken: string,
): Promise<string | null> {
  const res = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) return null;

  const emails = (await res.json()) as Array<{
    email: string;
    primary: boolean;
    verified: boolean;
  }>;

  const primary = emails.find((e) => e.primary && e.verified);
  return primary?.email ?? emails[0]?.email ?? null;
}
