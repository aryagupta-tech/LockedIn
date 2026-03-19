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

/**
 * Fetches total LeetCode problems solved (accepted) for a given username.
 */
export async function fetchLeetCodeSignal(username: string): Promise<SignalInput> {
  const handle = username.trim();
  if (!handle) throw new Error("LeetCode username is empty");

  const query = `
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
    throw new Error(json.errors[0].message);
  }

  const stats = json.data?.matchedUser?.submitStats?.acSubmissionNum;

  if (!stats) {
    throw new Error(`LeetCode user '${handle}' not found or has no stats`);
  }

  const allEntry = stats.find(
    (s) => s.difficulty.toLowerCase() === "all",
  );
  const total =
    allEntry?.count ??
    stats.reduce((sum, s) => {
      const d = s.difficulty.toLowerCase();
      if (d === "all") return sum;
      return sum + s.count;
    }, 0);

  return { key: "leetcode_problems", rawValue: total };
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
