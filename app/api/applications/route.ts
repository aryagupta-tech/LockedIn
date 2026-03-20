import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse, generateId, now } from "@/lib/api-utils";
import { checkAnyPlatformPasses, PLATFORM_THRESHOLDS } from "@/lib/scoring/engine";
import type { SignalInput } from "@/lib/scoring/engine";
import { fetchApplicationSignals } from "@/lib/scoring/fetch-application-signals";
import { validatePlatformOwnership } from "@/lib/verification/platform-ownership";

function buildScoreBreakdown(
  signals: SignalInput[],
  fetchErrors: Record<string, string>,
): Record<string, unknown> {
  const breakdown: Record<string, unknown> = {};

  for (const signal of signals) {
    const threshold = PLATFORM_THRESHOLDS[signal.key];
    if (threshold !== undefined) {
      breakdown[signal.key] = {
        rawValue: signal.rawValue,
        threshold,
        passed: signal.rawValue >= threshold,
      };
    }
  }

  if (Object.keys(fetchErrors).length > 0) {
    breakdown._fetchErrors = fetchErrors;
  }

  breakdown._eligibilityRule =
    "Auto-approve if ANY: GitHub ≥500 contributions OR LeetCode ≥100 solved OR Codeforces rating ≥900 — each proof must be tied to your GitHub sign-in (see ownership rules).";

  return breakdown;
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const userId = auth.user.id;

    const body = await request.json();
    const { githubUrl, codeforcesHandle, leetcodeHandle } = body;

    const gh = typeof githubUrl === "string" ? githubUrl.trim() : "";
    const cf = typeof codeforcesHandle === "string" ? codeforcesHandle.trim() : "";
    const lc = typeof leetcodeHandle === "string" ? leetcodeHandle.trim() : "";

    if (!gh && !cf && !lc) {
      return errorResponse(
        "Provide at least one of GitHub profile URL, Codeforces handle, or LeetCode username.",
        "VALIDATION_ERROR",
        400,
      );
    }

    const supabase = createServiceClient();

    const { data: dbUser, error: profErr } = await supabase
      .from("users")
      .select("id, githubUsername")
      .eq("id", userId)
      .single();

    if (profErr || !dbUser) {
      return errorResponse("User record not found", "NOT_FOUND", 404);
    }

    const ownershipViolation = await validatePlatformOwnership(
      {
        githubUrl: gh || undefined,
        codeforcesHandle: cf || undefined,
        leetcodeHandle: lc || undefined,
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

    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("userId", userId)
      .in("status", ["PENDING", "PROCESSING", "UNDER_REVIEW"])
      .limit(1)
      .maybeSingle();

    if (existing) {
      return errorResponse(
        "You already have a pending application. Please wait for it to be reviewed.",
        "CONFLICT",
        409,
      );
    }

    const ts = now();
    const appId = generateId();
    const application: Record<string, unknown> = {
      id: appId,
      userId,
      status: "PROCESSING",
      githubUrl: gh || null,
      codeforcesHandle: cf || null,
      leetcodeHandle: lc || null,
      portfolioUrl: null,
      score: null,
      scoreBreakdown: null,
      passingThreshold: null,
      createdAt: ts,
      updatedAt: ts,
    };

    const { error: insertError } = await supabase
      .from("applications")
      .insert(application);
    if (insertError) {
      console.error("applications insert failed:", insertError);
      return errorResponse("Could not create application", "DB_ERROR", 500);
    }

    try {
      const { signals, errors: fetchErrors } = await fetchApplicationSignals({
        githubUrl: application.githubUrl as string | null,
        codeforcesHandle: application.codeforcesHandle as string | null,
        leetcodeHandle: application.leetcodeHandle as string | null,
      });

      const passed = checkAnyPlatformPasses(signals);
      const decision = passed ? "APPROVED" : "UNDER_REVIEW";
      const breakdown = buildScoreBreakdown(signals, fetchErrors);

      const { error: appUpdateError } = await supabase
        .from("applications")
        .update({
          score: passed ? 100 : 0,
          scoreBreakdown: breakdown as object,
          passingThreshold: 1,
          status: decision,
          updatedAt: now(),
        })
        .eq("id", appId);

      if (appUpdateError) {
        console.error("applications update failed:", appUpdateError);
        throw appUpdateError;
      }

      if (decision === "APPROVED") {
        const { error: userUpdateError } = await supabase
          .from("users")
          .update({ status: "APPROVED", updatedAt: now() })
          .eq("id", userId);
        if (userUpdateError) {
          console.error("users.status APPROVED update failed:", userUpdateError);
          throw userUpdateError;
        }
      }

      application.score = passed ? 100 : 0;
      application.scoreBreakdown = breakdown;
      application.passingThreshold = 1;
      application.status = decision;
    } catch (scoringErr) {
      console.error("Scoring failed, setting to UNDER_REVIEW:", scoringErr);
      await supabase
        .from("applications")
        .update({ status: "UNDER_REVIEW", updatedAt: now() })
        .eq("id", appId);
      application.status = "UNDER_REVIEW";
    }

    return NextResponse.json(application, { status: 201 });
  } catch (e) {
    console.error("Application error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
