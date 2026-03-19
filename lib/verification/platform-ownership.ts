import { createHmac } from "node:crypto";
import { extractGitHubUsername } from "@/lib/github-username";
import { fetchLeetCodeGithubUrl } from "@/lib/scoring/providers/leetcode";
import { fetchCodeforcesProfile } from "@/lib/scoring/providers/codeforces";

export type ApplicationPlatformBody = {
  githubUrl?: string;
  codeforcesHandle?: string;
  leetcodeHandle?: string;
};

export type DbUserForOwnership = {
  id: string;
  githubUsername: string | null;
};

/**
 * Deterministic phrase the user must place in Codeforces "Organization" to prove
 * handle ownership (CF API does not expose GitHub links).
 */
export function getCodeforcesVerificationPhrase(
  userId: string,
  githubLogin: string,
): string {
  const secret =
    process.env.LOCKEDIN_VERIFICATION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "Set LOCKEDIN_VERIFICATION_SECRET (recommended) or SUPABASE_SERVICE_ROLE_KEY for Codeforces ownership verification.",
    );
  }
  const raw = createHmac("sha256", secret)
    .update(`${userId}:${githubLogin.toLowerCase()}`)
    .digest("hex");
  return `LI-${raw.slice(0, 12)}`;
}

function normalizeGithubLoginFromLeetCodeField(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  const fromUrl = extractGitHubUsername(s);
  if (fromUrl) return fromUrl.toLowerCase();
  if (/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(s)) {
    return s.toLowerCase();
  }
  return null;
}

export type OwnershipViolation = {
  code: string;
  message: string;
  status: number;
};

/**
 * Ensures submitted platform identities belong to the logged-in user (GitHub OAuth identity).
 * Returns a violation object if validation fails, otherwise null.
 */
export async function validatePlatformOwnership(
  body: ApplicationPlatformBody,
  user: DbUserForOwnership,
): Promise<OwnershipViolation | null> {
  const gh = body.githubUrl?.trim() || "";
  const cf = body.codeforcesHandle?.trim() || "";
  const lc = body.leetcodeHandle?.trim() || "";

  if (!gh && !cf && !lc) {
    return {
      code: "VALIDATION_ERROR",
      message:
        "Provide at least one of GitHub profile URL, Codeforces handle, or LeetCode username.",
      status: 400,
    };
  }

  const linkedLogin = user.githubUsername?.trim().toLowerCase() || null;
  if (!linkedLogin) {
    return {
      code: "GITHUB_IDENTITY_REQUIRED",
      message:
        "Auto-verification only works for accounts that signed in with GitHub (so we can tie proofs to you). Sign out and use “Continue with GitHub”, then apply again.",
      status: 403,
    };
  }

  if (gh) {
    const fromUrl = extractGitHubUsername(gh);
    if (!fromUrl || fromUrl.toLowerCase() !== linkedLogin) {
      return {
        code: "GITHUB_MISMATCH",
        message:
          "GitHub profile URL must be your own — it must match the GitHub account you used to sign in.",
        status: 403,
      };
    }
  }

  if (lc) {
    let githubOnLc: string | null;
    try {
      githubOnLc = await fetchLeetCodeGithubUrl(lc);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        code: "LEETCODE_VERIFY_FAILED",
        message: `Could not read LeetCode profile: ${msg}`,
        status: 400,
      };
    }
    const normalized = normalizeGithubLoginFromLeetCodeField(githubOnLc);
    if (!normalized) {
      return {
        code: "LEETCODE_GITHUB_NOT_LINKED",
        message:
          "On LeetCode, open Profile → Settings and add your GitHub URL (the same account you use to sign in here). Save, then try again.",
        status: 403,
      };
    }
    if (normalized !== linkedLogin) {
      return {
        code: "LEETCODE_GITHUB_MISMATCH",
        message:
          "Your LeetCode profile must link the same GitHub account you used to sign in to LockedIn.",
        status: 403,
      };
    }
  }

  if (cf) {
    let phrase: string;
    try {
      phrase = getCodeforcesVerificationPhrase(user.id, linkedLogin);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        code: "VERIFICATION_CONFIG",
        message: msg,
        status: 500,
      };
    }

    try {
      const profile = await fetchCodeforcesProfile(cf);
      const org = (profile.organization || "").trim();
      if (!org.toLowerCase().includes(phrase.toLowerCase())) {
        return {
          code: "CODEFORCES_ORG_REQUIRED",
          message:
            `On Codeforces, set your profile “Organization” field to exactly: ${phrase} (copy from the Apply page). Save, wait a few seconds, then submit again. You can change it back after you’re approved.`,
          status: 403,
        };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        code: "CODEFORCES_VERIFY_FAILED",
        message: msg,
        status: 400,
      };
    }
  }

  return null;
}
