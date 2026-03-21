import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse } from "@/lib/api-utils";
import { checkAnyPlatformPasses } from "@/lib/scoring/engine";
import { fetchApplicationSignals } from "@/lib/scoring/fetch-application-signals";
import { validatePlatformOwnership } from "@/lib/verification/platform-ownership";
import {
  normalizeCodeforcesHandle,
  normalizeLeetCodeHandle,
} from "@/lib/platform-handles";
import { ensurePublicUserRow } from "@/lib/ensure-public-user";
import { buildPlatformProgressFromSignals } from "@/lib/eligibility-progress";

/**
 * Preview eligibility without creating an application: same ownership rules,
 * returns per-platform "have vs need" for the submitted fields.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { githubUrl, codeforcesHandle, leetcodeHandle } = body;

    const gh = typeof githubUrl === "string" ? githubUrl.trim() : "";
    const cfRaw =
      typeof codeforcesHandle === "string" ? codeforcesHandle.trim() : "";
    const lcRaw =
      typeof leetcodeHandle === "string" ? leetcodeHandle.trim() : "";
    const cf = cfRaw ? normalizeCodeforcesHandle(cfRaw) : "";
    const lc = lcRaw ? normalizeLeetCodeHandle(lcRaw) : "";

    if (lcRaw && !lc) {
      return errorResponse(
        "That doesn’t look like a valid LeetCode profile link or username.",
        "VALIDATION_ERROR",
        400,
      );
    }
    if (cfRaw && !cf) {
      return errorResponse(
        "That doesn’t look like a valid Codeforces profile link or handle.",
        "VALIDATION_ERROR",
        400,
      );
    }
    if (!gh && !cf && !lc) {
      return errorResponse(
        "Add at least one of GitHub profile URL, Codeforces handle, or LeetCode username.",
        "VALIDATION_ERROR",
        400,
      );
    }

    const supabase = createServiceClient();
    await ensurePublicUserRow(supabase, auth.user);

    const { data: dbUser, error: profErr } = await supabase
      .from("users")
      .select("id, githubUsername")
      .eq("id", auth.user.id)
      .single();

    if (profErr || !dbUser) {
      return errorResponse(
        "Could not load your profile. Try signing out and signing in again.",
        "NOT_FOUND",
        404,
      );
    }

    const ownershipViolation = await validatePlatformOwnership(
      {
        githubUrl: gh || undefined,
        codeforcesHandle: cfRaw || undefined,
        leetcodeHandle: lcRaw || undefined,
      },
      dbUser,
    );
    if (ownershipViolation) {
      return errorResponse(
        ownershipViolation.message,
        ownershipViolation.code,
        ownershipViolation.status,
      );
    }

    const appPayload = {
      githubUrl: gh || null,
      codeforcesHandle: cf || null,
      leetcodeHandle: lc || null,
    };

    const { signals, errors } = await fetchApplicationSignals(appPayload);
    const anyPass = checkAnyPlatformPasses(signals);
    const platforms = buildPlatformProgressFromSignals(signals, errors, appPayload);

    return NextResponse.json({
      anyPass,
      platforms,
      rule:
        "Auto-approve if ANY: GitHub ≥250 contributions (last year) OR LeetCode ≥100 solved OR Codeforces rating ≥900.",
    });
  } catch (e) {
    console.error("Application preview error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
