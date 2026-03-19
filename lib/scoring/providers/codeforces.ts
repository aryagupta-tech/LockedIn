import type { SignalInput } from "../engine";

const USER_AGENT =
  process.env.CODEFORCES_USER_AGENT ||
  "LockedIn-SignalBot/1.0 (+https://lockedin-arya.vercel.app)";

interface CFUserInfo {
  status: string;
  result: Array<{
    handle: string;
    rating?: number;
    maxRating?: number;
    rank?: string;
    organization?: string;
  }>;
}

export type CodeforcesPublicProfile = {
  handle: string;
  rating: number;
  maxRating: number;
  organization: string | null;
};

export async function fetchCodeforcesProfile(
  handle: string,
): Promise<CodeforcesPublicProfile> {
  const trimmed = handle.trim();
  if (!trimmed) throw new Error("Codeforces handle is empty");

  const url = `https://codeforces.com/api/user.info?handles=${encodeURIComponent(trimmed)}`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    if (res.status === 400) {
      throw new Error(`Codeforces user '${trimmed}' not found`);
    }
    throw new Error(`Codeforces API returned ${res.status}`);
  }

  const data = (await res.json()) as CFUserInfo;

  if (data.status !== "OK" || !data.result?.length) {
    throw new Error(`Codeforces returned unexpected response for '${trimmed}'`);
  }

  const u = data.result[0];
  const current = u.rating ?? 0;
  const peak = u.maxRating ?? 0;

  return {
    handle: u.handle,
    rating: current,
    maxRating: peak,
    organization: u.organization?.trim() ? u.organization.trim() : null,
  };
}

/**
 * Fetches peak Codeforces rating for a handle.
 * Uses the public Codeforces API — no auth required.
 */
export async function fetchCodeforcesSignal(
  handle: string,
): Promise<SignalInput> {
  const p = await fetchCodeforcesProfile(handle);
  const rating = Math.max(p.rating, p.maxRating);

  return { key: "codeforces_rating", rawValue: rating };
}
