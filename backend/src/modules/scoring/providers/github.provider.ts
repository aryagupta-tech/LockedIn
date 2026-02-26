import type { SignalInput } from "../scoring.engine";

/**
 * Fetches a user's GitHub contribution count for the current year using
 * the REST API. Falls back to public_repos count if the events endpoint
 * doesn't have sufficient data.
 *
 * For authenticated requests (when we have the user's token), we use the
 * GraphQL API which gives a precise 1-year contribution total.
 */
export async function fetchGitHubSignal(
  username: string,
  accessToken?: string,
): Promise<SignalInput> {
  try {
    if (accessToken) {
      return await fetchViaGraphQL(username, accessToken);
    }
    return await fetchViaREST(username);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown GitHub fetch error";
    throw new Error(`GitHub provider failed for '${username}': ${message}`);
  }
}

async function fetchViaGraphQL(
  username: string,
  token: string,
): Promise<SignalInput> {
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { login: username } }),
  });

  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);

  const json = (await res.json()) as {
    data?: {
      user?: {
        contributionsCollection: {
          contributionCalendar: { totalContributions: number };
        };
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  const total =
    json.data?.user?.contributionsCollection.contributionCalendar
      .totalContributions ?? 0;

  return { key: "github_contributions", rawValue: total };
}

async function fetchViaREST(username: string): Promise<SignalInput> {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error("GitHub user not found");
    throw new Error(`GitHub REST API returned ${res.status}`);
  }

  const user = (await res.json()) as { public_repos: number; followers: number };

  // Heuristic: public repos × 50 as a rough contributions proxy.
  // This is intentionally conservative — users are encouraged to OAuth
  // for an accurate count.
  const estimated = user.public_repos * 50;

  return { key: "github_contributions", rawValue: estimated };
}
