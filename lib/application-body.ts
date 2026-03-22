import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
import {
  normalizeCodeforcesHandle,
  normalizeCodolioProfileKey,
  normalizeLeetCodeHandle,
} from "@/lib/platform-handles";

export type ParsedApplicationProofBody = {
  gh: string;
  cfRaw: string;
  lcRaw: string;
  coRaw: string;
  cf: string;
  lc: string;
  co: string;
};

/**
 * Shared validation for apply / preview / update endpoints.
 */
export function parseApplicationProofBody(body: unknown):
  | { ok: true; data: ParsedApplicationProofBody }
  | { ok: false; response: NextResponse } {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      response: errorResponse("Invalid JSON body", "VALIDATION_ERROR", 400),
    };
  }

  const o = body as Record<string, unknown>;
  const githubUrl = o.githubUrl;
  const codeforcesHandle = o.codeforcesHandle;
  const leetcodeHandle = o.leetcodeHandle;
  const codolioProfile = o.codolioProfile;

  const gh = typeof githubUrl === "string" ? githubUrl.trim() : "";
  const cfRaw =
    typeof codeforcesHandle === "string" ? codeforcesHandle.trim() : "";
  const lcRaw =
    typeof leetcodeHandle === "string" ? leetcodeHandle.trim() : "";
  const coRaw =
    typeof codolioProfile === "string" ? codolioProfile.trim() : "";
  const cf = cfRaw ? normalizeCodeforcesHandle(cfRaw) : "";
  const lc = lcRaw ? normalizeLeetCodeHandle(lcRaw) : "";
  const co = coRaw ? normalizeCodolioProfileKey(coRaw) : "";

  if (lcRaw && !lc) {
    return {
      ok: false,
      response: errorResponse(
        "That doesn’t look like a valid LeetCode profile link or username. Open your LeetCode profile and copy the link (…/u/yourname) or type your handle only.",
        "VALIDATION_ERROR",
        400,
      ),
    };
  }

  if (cfRaw && !cf) {
    return {
      ok: false,
      response: errorResponse(
        "That doesn’t look like a valid Codeforces profile link or handle. Use your profile URL (…/profile/yourhandle) or your handle only.",
        "VALIDATION_ERROR",
        400,
      ),
    };
  }

  if (coRaw && !co) {
    return {
      ok: false,
      response: errorResponse(
        "That doesn’t look like a valid Codolio profile link or @username. Use your public profile URL (codolio.com/profile/yourname) or your profile name only.",
        "VALIDATION_ERROR",
        400,
      ),
    };
  }

  if (!gh && !cf && !lc && !co) {
    return {
      ok: false,
      response: errorResponse(
        "Provide at least one of GitHub profile URL, Codeforces handle, LeetCode username, or Codolio profile.",
        "VALIDATION_ERROR",
        400,
      ),
    };
  }

  return { ok: true, data: { gh, cfRaw, lcRaw, coRaw, cf, lc, co } };
}
