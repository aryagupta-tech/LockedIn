import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse } from "@/lib/api-utils";
import { checkAnyPlatformPasses } from "@/lib/scoring/engine";
import { fetchApplicationSignals } from "@/lib/scoring/fetch-application-signals";
import { validatePlatformOwnership } from "@/lib/verification/platform-ownership";
import { parseApplicationProofBody } from "@/lib/application-body";
import { ensurePublicUserRow } from "@/lib/ensure-public-user";
import { ensureGithubUsernameSyncedFromAuth } from "@/lib/github-profile-sync";
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
    const parsed = parseApplicationProofBody(body);
    if (!parsed.ok) return parsed.response;
    const { gh, cfRaw, lcRaw, cf, lc } = parsed.data;

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

    const dbUserSynced = await ensureGithubUsernameSyncedFromAuth(
      supabase,
      auth.user,
      dbUser,
    );

    const ownershipViolation = await validatePlatformOwnership(
      {
        githubUrl: gh || undefined,
        codeforcesHandle: cfRaw || undefined,
        leetcodeHandle: lcRaw || undefined,
      },
      dbUserSynced,
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
