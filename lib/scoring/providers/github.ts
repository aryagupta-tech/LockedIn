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

/** Matches the big number on profile / contributions pages (public view). */
function parseContributionsHeadline(html: string): number | null {
  const patterns = [
    /(\d[\d,]*)\s+contributions?\s+in\s+the\s+last\s+year/i,
    /in\s+the\s+last\s+year[^0-9]{0,60}(\d[\d,]*)/i,
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m?.[1]) {
      const n = parseInt(m[1].replace(/,/g, ""), 10);
      if (Number.isFinite(n) && n >= 0 && n < 1_000_000) return n;
    }
  }

  const lower = html.toLowerCase();
  const needle = "contributions in the last year";
  const idx = lower.indexOf(needle);
  if (idx !== -1) {
    const window = html.slice(Math.max(0, idx - 200), idx);
    const nums = [...window.matchAll(/(\d[\d,]*)/g)];
    const last = nums.at(-1);
    if (last?.[1]) {
      const n = parseInt(last[1].replace(/,/g, ""), 10);
      if (Number.isFinite(n) && n >= 0 && n < 1_000_000) return n;
    }
  }

  return null;
}

function sumContributionCalendarDays(calendar: {
  weeks?: Array<{ contributionDays?: Array<{ contributionCount?: number }> }>;
}): number {
  let sum = 0;
  for (const week of calendar.weeks ?? []) {
    for (const day of week.contributionDays ?? []) {
      const c = day.contributionCount;
      if (typeof c === "number" && Number.isFinite(c)) sum += c;
    }
  }
  return sum;
}

/**
 * Rolling window (≤365d). GitHub allows at most ~1 year per contributionsCollection.
 */
function githubRollingContributionsWindow(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime());
  from.setTime(from.getTime() - 364 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

async function fetchViaGraphQL(login: string, token: string): Promise<SignalInput> {
  const { from, to } = githubRollingContributionsWindow();

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
              }
            }
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
        contributionsCollection?: {
          contributionCalendar?: {
            totalContributions?: number;
            weeks?: Array<{
              contributionDays?: Array<{ contributionCount?: number }>;
            }>;
          };
        };
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  const cal = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) {
    throw new Error("GitHub GraphQL returned no contribution calendar");
  }

  const fromDays = sumContributionCalendarDays(cal);
  const reported = cal.totalContributions ?? 0;
  // Prefer the detailed calendar sum; totalContributions sometimes disagrees with the profile.
  const rawValue = Math.max(fromDays, reported);

  return { key: "github_contributions", rawValue };
}

/**
 * Public HTML: headline on profile is the same number users see; calendar DOM
 * often uses data-level (0–4) not per-day data-count — do not rely on data-count sums.
 */
async function fetchContributionsFromPublicHtml(login: string): Promise<number> {
  const urls = [
    `https://github.com/${encodeURIComponent(login)}`,
    `https://github.com/users/${encodeURIComponent(login)}/contributions`,
  ];

  for (const url of urls) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (res.status === 404) throw new Error("GitHub user not found");
    if (!res.ok) continue;

    const html = await res.text();
    const headline = parseContributionsHeadline(html);
    if (headline !== null) return headline;
  }

  throw new Error(
    "Could not read contributions from GitHub HTML (layout may have changed). Set GITHUB_TOKEN for GraphQL.",
  );
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
 * Tooltip / legacy cell parse — last resort when headline missing.
 */
function sumFromContributionTooltips(html: string): number | null {
  const tooltipRe =
    />(?:No contributions|(\d+) contributions?) on[^<]+<\/tool-tip>/gi;
  let sum = 0;
  let matched = false;
  for (const m of html.matchAll(tooltipRe)) {
    matched = true;
    if (m[1]) sum += parseInt(m[1], 10);
  }
  return matched ? sum : null;
}

/**
 * Fetches GitHub contributions for the rolling year shown on the profile.
 * - With `GITHUB_TOKEN`: GraphQL calendar, summing each day's `contributionCount`.
 * - Without token: parses the public "**N** contributions in the last year" headline
 *   (calendar `data-count` scraping is unreliable since GitHub moved to `data-level`).
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
        const gql = await fetchViaGraphQL(login, token);
        try {
          const htmlTotal = await fetchContributionsFromPublicHtml(login);
          return {
            key: "github_contributions",
            rawValue: Math.max(gql.rawValue, htmlTotal),
          };
        } catch {
          return gql;
        }
      } catch (graphqlErr) {
        console.warn(
          `[GitHub] GraphQL failed for ${login}, falling back to public HTML:`,
          graphqlErr,
        );
      }
    }

    await assertGitHubUserExists(login);
    try {
      const fromHeadline = await fetchContributionsFromPublicHtml(login);
      return { key: "github_contributions", rawValue: fromHeadline };
    } catch {
      const res = await fetch(
        `https://github.com/users/${encodeURIComponent(login)}/contributions`,
        {
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml",
          },
        },
      );
      if (!res.ok) {
        throw new Error(`GitHub contributions page returned ${res.status}`);
      }
      const html = await res.text();
      const fromTips = sumFromContributionTooltips(html);
      if (fromTips !== null) {
        return { key: "github_contributions", rawValue: fromTips };
      }
      throw new Error(
        "Could not parse GitHub contributions. Set GITHUB_TOKEN or try again later.",
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown GitHub fetch error";
    throw new Error(`GitHub provider failed for '${login}': ${message}`);
  }
}
