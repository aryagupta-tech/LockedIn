import { extractGitHubUsername } from "@/lib/github-username";
import type { SignalInput } from "../engine";

const USER_AGENT =
  process.env.CODOLIO_USER_AGENT ||
  "LockedIn-SignalBot/1.0 (+https://lockedin-arya.vercel.app)";

const API_ORIGIN = "https://api.codolio.com";
const NODE_ORIGIN = "https://node.codolio.com/api";

type CodolioUserDetailsPayload = {
  isVerified?: boolean;
  userDetails?: {
    githubProfile?: string | null;
    socialMediaProfileList?: Array<{
      socialMediaPlatform?: string;
      handle?: string | null;
    }>;
    userPersonalDetails?: {
      imageUrl?: string | null;
    };
  };
  githubProfileDetails?: { userId?: number };
};

type CodolioUserDetailsEnvelope = {
  status?: { success?: boolean; code?: number; message?: string };
  data?: CodolioUserDetailsPayload;
};

function normalizeGithubLoginFromCodolioField(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const candidate = extractGitHubUsername(raw.trim());
  if (!candidate) return null;
  const login = candidate.split("/")[0]?.split("?")[0]?.trim().toLowerCase() || "";
  if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(login)) return login;
  return null;
}

function linkedGitHubLoginFromDetails(data: CodolioUserDetailsPayload): string | null {
  const gp = normalizeGithubLoginFromCodolioField(data.userDetails?.githubProfile);
  if (gp) return gp;
  const list = data.userDetails?.socialMediaProfileList;
  const row = list?.find(
    (x) => (x.socialMediaPlatform || "").toLowerCase() === "github",
  );
  return normalizeGithubLoginFromCodolioField(row?.handle ?? null);
}

function numericUserIdFromDetails(data: CodolioUserDetailsPayload): number | null {
  const fromGh = data.githubProfileDetails?.userId;
  if (typeof fromGh === "number" && Number.isFinite(fromGh) && fromGh > 0) {
    return fromGh;
  }
  const url = data.userDetails?.userPersonalDetails?.imageUrl;
  if (!url) return null;
  const m = url.match(/cloudfront\.net\/(\d+)_/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function fetchCodolioUserDetailsPayload(
  profileKey: string,
): Promise<CodolioUserDetailsPayload> {
  const key = profileKey.trim();
  if (!key) throw new Error("Codolio profile name is empty");

  const url = `${API_ORIGIN}/user/details?userKey=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Codolio returned ${res.status} for profile “${key}”`);
  }

  const envelope = (await res.json()) as CodolioUserDetailsEnvelope;
  if (!envelope.status?.success || !envelope.data) {
    const msg = envelope.status?.message?.trim();
    throw new Error(
      msg
        ? `Codolio: ${msg}`
        : `Codolio profile “${key}” was not found or could not be loaded.`,
    );
  }

  return envelope.data;
}

/**
 * GitHub login linked on the Codolio account (for ownership checks).
 */
export async function fetchCodolioLinkedGitHubLogin(
  profileKey: string,
): Promise<string | null> {
  const data = await fetchCodolioUserDetailsPayload(profileKey);
  return linkedGitHubLoginFromDetails(data);
}

/**
 * Codolio C-Score (0–900 scale per Codolio docs) from the public leaderboard API.
 */
export async function fetchCodolioSignal(profileKey: string): Promise<SignalInput> {
  const data = await fetchCodolioUserDetailsPayload(profileKey);

  if (!data.isVerified) {
    throw new Error(
      "Codolio profile is not verified — complete platform verification on Codolio so your C-Score is published.",
    );
  }

  const userId = numericUserIdFromDetails(data);
  if (userId === null) {
    throw new Error(
      "Could not read your Codolio account id — connect GitHub on Codolio (Development section) and ensure your profile is public enough to sync.",
    );
  }

  const lbUrl = `${NODE_ORIGIN}/leaderboard/v1/get-user-leaderboard?userId=${encodeURIComponent(String(userId))}`;
  const lbRes = await fetch(lbUrl, {
    cache: "no-store",
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (!lbRes.ok) {
    throw new Error(`Codolio leaderboard returned ${lbRes.status}`);
  }

  const lbJson = (await lbRes.json()) as {
    status?: { success?: boolean };
    data?: {
      global?: Record<string, { score?: number } | null>;
      leaderboard?: Record<string, { score?: number } | null>;
    };
  };

  if (!lbJson.status?.success || !lbJson.data) {
    throw new Error("Codolio leaderboard returned an unexpected response.");
  }

  const g = lbJson.data.global?.["1"] ?? lbJson.data.leaderboard?.["1"];
  const raw = g?.score;
  const score = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;

  return { key: "codolio_c_score", rawValue: score };
}
