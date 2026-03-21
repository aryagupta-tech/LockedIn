import type { SignalInput } from "../engine";

const USER_AGENT =
  process.env.LEETCODE_USER_AGENT ||
  "Mozilla/5.0 (compatible; LockedIn/1.0; +https://lockedin-arya.vercel.app)";

const LEETCODE_ORIGIN = "https://leetcode.com";

interface LeetCodeResponse {
  data?: {
    matchedUser?: {
      submitStats?: {
        acSubmissionNum: Array<{
          difficulty: string;
          count: number;
        }>;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

function parseCsrfFromSetCookieLine(line: string): string | undefined {
  const m = /^csrftoken=([^;]+)/.exec(line.trim());
  return m?.[1];
}

/**
 * LeetCode enables CSRF checks on some GraphQL fields (including submitStats).
 * We obtain csrftoken from the homepage Set-Cookie, then send it as Cookie +
 * x-csrftoken on the GraphQL request.
 *
 * Optional: set LEETCODE_CSRF_TOKEN in env if cookie acquisition fails in your
 * hosting region (paste value of the csrftoken cookie).
 */
async function getLeetCodeCsrfToken(): Promise<string | undefined> {
  const fromEnv = process.env.LEETCODE_CSRF_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  const res = await fetch(`${LEETCODE_ORIGIN}/`, {
    cache: "no-store",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  const headers = res.headers as unknown as {
    getSetCookie?: () => string[];
  };

  if (typeof headers.getSetCookie === "function") {
    for (const line of headers.getSetCookie()) {
      const token = parseCsrfFromSetCookieLine(line);
      if (token) return token;
    }
  }

  const combined = res.headers.get("set-cookie");
  if (combined) {
    for (const part of combined.split(/,(?=[^;]+?=)/)) {
      const token = parseCsrfFromSetCookieLine(part);
      if (token) return token;
    }
  }

  return undefined;
}

function uniqueSolvedFromAcSubmissionNum(
  stats: Array<{ difficulty: string; count: number }>,
): number {
  const allEntry = stats.find((s) => s.difficulty.toLowerCase() === "all");
  if (allEntry !== undefined) return allEntry.count;
  return stats.reduce((sum, s) => {
    const d = s.difficulty.toLowerCase();
    if (d === "all") return sum;
    return sum + s.count;
  }, 0);
}

const QUERY_SUBMIT_STATS_GLOBAL = `
  query userStats($username: String!) {
    matchedUser(username: $username) {
      submitStats: submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

const QUERY_SUBMIT_STATS_LEGACY = `
  query userStats($username: String!) {
    matchedUser(username: $username) {
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

async function fetchLeetCodeAcStatsGraphQL(
  handle: string,
  query: string,
): Promise<LeetCodeResponse> {
  const csrftoken = await getLeetCodeCsrfToken();

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    Referer: `${LEETCODE_ORIGIN}/`,
    Origin: LEETCODE_ORIGIN,
    "X-Requested-With": "XMLHttpRequest",
  };

  if (csrftoken) {
    requestHeaders.Cookie = `csrftoken=${csrftoken}`;
    requestHeaders["x-csrftoken"] = csrftoken;
  }

  const res = await fetch(`${LEETCODE_ORIGIN}/graphql`, {
    cache: "no-store",
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ query, variables: { username: handle } }),
  });

  if (!res.ok) {
    throw new Error(`LeetCode API returned ${res.status}`);
  }

  const text = await res.text();
  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
    throw new Error(
      "LeetCode blocked the stats request (CSRF or bot protection). Try again later or set LEETCODE_CSRF_TOKEN for your deployment.",
    );
  }

  let json: LeetCodeResponse;
  try {
    json = JSON.parse(text) as LeetCodeResponse;
  } catch {
    throw new Error("LeetCode returned a non-JSON response for stats");
  }

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }

  return json;
}

/**
 * Fetches **unique** problems solved (same notion as the LeetCode profile),
 * using `submitStatsGlobal` when available. The legacy `submitStats` field can
 * reflect accepted *submissions* more than unique solves — we prefer global stats.
 */
export async function fetchLeetCodeSignal(username: string): Promise<SignalInput> {
  const handle = username.trim();
  if (!handle) throw new Error("LeetCode username is empty");

  let lastErr: Error | null = null;

  for (const q of [QUERY_SUBMIT_STATS_GLOBAL, QUERY_SUBMIT_STATS_LEGACY]) {
    try {
      const json = await fetchLeetCodeAcStatsGraphQL(handle, q);
      const stats = json.data?.matchedUser?.submitStats?.acSubmissionNum;

      if (!stats?.length) {
        throw new Error(`LeetCode user '${handle}' not found or has no stats`);
      }

      const total = uniqueSolvedFromAcSubmissionNum(stats);
      return { key: "leetcode_problems", rawValue: total };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw new Error(
    lastErr?.message ||
      `LeetCode stats failed for '${handle}'. Set LEETCODE_CSRF_TOKEN if requests are blocked.`,
  );
}

interface LeetCodeGithubResponse {
  data?: { matchedUser?: { githubUrl: string | null } };
  errors?: Array<{ message: string }>;
}

/**
 * Public GraphQL field — used to prove LeetCode account ↔ GitHub identity.
 */
export async function fetchLeetCodeGithubUrl(
  username: string,
): Promise<string | null> {
  const handle = username.trim();
  if (!handle) throw new Error("LeetCode username is empty");

  const query = `query ($u: String!) { matchedUser(username: $u) { githubUrl } }`;

  const res = await fetch(`${LEETCODE_ORIGIN}/graphql`, {
    cache: "no-store",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      Referer: `${LEETCODE_ORIGIN}/`,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({ query, variables: { username: handle } }),
  });

  if (!res.ok) {
    throw new Error(`LeetCode API returned ${res.status}`);
  }

  const text = await res.text();
  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
    throw new Error(
      "LeetCode blocked the request. Try again later or set LEETCODE_CSRF_TOKEN.",
    );
  }

  let json: LeetCodeGithubResponse;
  try {
    json = JSON.parse(text) as LeetCodeGithubResponse;
  } catch {
    throw new Error("LeetCode returned a non-JSON response");
  }

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  const url = json.data?.matchedUser?.githubUrl;
  return url?.trim() ? url.trim() : null;
}
