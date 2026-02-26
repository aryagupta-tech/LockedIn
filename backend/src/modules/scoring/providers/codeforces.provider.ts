import type { SignalInput } from "../scoring.engine";

interface CFUserInfo {
  status: string;
  result: Array<{
    handle: string;
    rating?: number;
    maxRating?: number;
    rank?: string;
  }>;
}

/**
 * Fetches peak Codeforces rating for a handle.
 * Uses the public Codeforces API — no auth required.
 */
export async function fetchCodeforcesSignal(
  handle: string,
): Promise<SignalInput> {
  const url = `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 400) {
      throw new Error(`Codeforces user '${handle}' not found`);
    }
    throw new Error(`Codeforces API returned ${res.status}`);
  }

  const data = (await res.json()) as CFUserInfo;

  if (data.status !== "OK" || !data.result?.length) {
    throw new Error(`Codeforces returned unexpected response for '${handle}'`);
  }

  const maxRating = data.result[0].maxRating ?? data.result[0].rating ?? 0;

  return { key: "codeforces_rating", rawValue: maxRating };
}
