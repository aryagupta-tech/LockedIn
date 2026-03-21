import type { SignalInput } from "../engine";

const USER_AGENT =
  process.env.GITHUB_USER_AGENT ||
  "LockedIn-SignalBot/1.0 (+https://lockedin-arya.vercel.app)";

function githubRestHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}

/**
 * Fetches GitHub contributions in a **rolling ~365-day window** (GraphQL with
 * explicit `from`/`to` when `GITHUB_TOKEN` is set — matches the profile grid,
 * not “calendar year only”). Without a token, scrapes the public contributions
 * page (data-count cells + tooltip fallback).
 */
export async function fetchGitHubSignal(
  username: string,
  accessToken?: string,
): Promise<SignalInput> {
  const login = username.trim();
  if (!login) throw new Error("GitHub username is empty");

  try {
    const token = accessToken || process.env.GITHUB_TOKEN;
    if (token) {
      try {
        return await fetchViaGraphQL(login, token);
      } catch (graphqlErr) {
        console.warn(
          `[GitHub] GraphQL failed for ${login}, falling back to public contributions page:`,
          graphqlErr,
        );
      }
    }

    await assertGitHubUserExists(login);
    const total = await fetchContributionsFromProfilePage(login);
    return { key: "github_contributions", rawValue: total };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown GitHub fetch error";
    throw new Error(`GitHub provider failed for '${login}': ${message}`);
  }
}

async function assertGitHubUserExists(login: string): Promise<void> {
  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(login)}`,
    { headers: githubRestHeaders() },
  );
  if (res.status === 404) throw new Error("GitHub user not found");
  if (!res.ok) {
    throw new Error(`GitHub REST API returned ${res.status}`);
  }
}

/**
 * Rolling window aligned with the green grid on GitHub profiles (~last 53 weeks).
 * Without `from`/`to`, GitHub defaults to the *calendar year* only — wildly wrong
 * outside Jan–Dec and does not match what users see on their profile.
 */
function githubRollingContributionsWindow(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime());
  // Rolling year (≤365d) — GitHub allows at most ~1 year per contributionsCollection.
  from.setTime(from.getTime() - 364 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

async function fetchViaGraphQL(login: string, token: string): Promise<SignalInput> {
  const { from, to } = githubRollingContributionsWindow();

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar { totalContributions }
        }
      }
    }
  `;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({ query, variables: { login, from, to } }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status}`);
  }

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

/**
 * Parses https://github.com/users/{login}/contributions HTML.
 * Prefer `data-count` on calendar cells (matches the profile grid); fall back to tooltips.
 */
async function fetchContributionsFromProfilePage(login: string): Promise<number> {
  const url = `https://github.com/users/${encodeURIComponent(login)}/contributions`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (res.status === 404) throw new Error("GitHub user not found");
  if (!res.ok) {
    throw new Error(`GitHub contributions page returned ${res.status}`);
  }

  const html = await res.text();

  const calIdx = html.indexOf("ContributionCalendar");
  let sumCells = 0;
  let cellMatches = 0;
  if (calIdx !== -1) {
    const slice = html.slice(calIdx, calIdx + 600_000);
    for (const m of slice.matchAll(/\bdata-count="(\d+)"/g)) {
      cellMatches++;
      sumCells += parseInt(m[1], 10);
    }
  }

  // Expect roughly one year of days on the contributions-only page
  if (cellMatches >= 200) {
    return sumCells;
  }

  const tooltipRe =
    />(?:No contributions|(\d+) contributions?) on[^<]+<\/tool-tip>/gi;
  let sum = 0;
  let matched = false;
  for (const m of html.matchAll(tooltipRe)) {
    matched = true;
    if (m[1]) sum += parseInt(m[1], 10);
  }

  if (!matched) {
    throw new Error(
      "Could not parse GitHub contribution calendar (GitHub HTML format may have changed). Set GITHUB_TOKEN for reliable counts.",
    );
  }

  return sum;
}
