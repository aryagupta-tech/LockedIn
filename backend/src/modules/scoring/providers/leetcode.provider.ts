import type { SignalInput } from "../scoring.engine";

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
}

/**
 * Fetches total LeetCode problems solved for a given username.
 * Uses LeetCode's public GraphQL endpoint (no auth).
 */
export async function fetchLeetCodeSignal(
  username: string,
): Promise<SignalInput> {
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

  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { username } }),
  });

  if (!res.ok) {
    throw new Error(`LeetCode API returned ${res.status}`);
  }

  const json = (await res.json()) as LeetCodeResponse;
  const stats = json.data?.matchedUser?.submitStats?.acSubmissionNum;

  if (!stats) {
    throw new Error(`LeetCode user '${username}' not found or has no stats`);
  }

  // "All" difficulty entry contains the aggregate total
  const allEntry = stats.find((s) => s.difficulty === "All");
  const total = allEntry?.count ?? stats.reduce((sum, s) => sum + s.count, 0);

  return { key: "leetcode_problems", rawValue: total };
}
