import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse, generateId, now } from "@/lib/api-utils";
import { checkAnyPlatformPasses, PLATFORM_THRESHOLDS } from "@/lib/scoring/engine";
import type { SignalInput } from "@/lib/scoring/engine";
import { fetchApplicationSignals } from "@/lib/scoring/fetch-application-signals";

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
    "Auto-approve if ANY: GitHub ≥500 contributions (last year on profile) OR LeetCode ≥100 solved OR Codeforces rating ≥900 (max of current vs peak).";

  return breakdown;
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const userId = auth.user.id;

    const body = await request.json();
    const { githubUrl, codeforcesHandle, leetcodeHandle, portfolioUrl } = body;

    const gh = typeof githubUrl === "string" ? githubUrl.trim() : "";
    const cf = typeof codeforcesHandle === "string" ? codeforcesHandle.trim() : "";
    const lc = typeof leetcodeHandle === "string" ? leetcodeHandle.trim() : "";
    const pf =
      typeof portfolioUrl === "string" ? portfolioUrl.trim() : "";

    if (!gh && !cf && !lc) {
      return errorResponse(
        "Provide at least one of GitHub profile URL, Codeforces handle, or LeetCode username. Portfolio alone cannot be verified automatically.",
        "VALIDATION_ERROR",
        400,
      );
    }

    const supabase = createServiceClient();

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
      portfolioUrl: pf || null,
      score: null,
      scoreBreakdown: null,
      passingThreshold: null,
      createdAt: ts,
      updatedAt: ts,
    };

    await supabase.from("applications").insert(application);

    try {
      const { signals, errors: fetchErrors } = await fetchApplicationSignals({
        githubUrl: application.githubUrl as string | null,
        codeforcesHandle: application.codeforcesHandle as string | null,
        leetcodeHandle: application.leetcodeHandle as string | null,
      });

      const passed = checkAnyPlatformPasses(signals);
      const decision = passed ? "APPROVED" : "UNDER_REVIEW";
      const breakdown = buildScoreBreakdown(signals, fetchErrors);

      await supabase
        .from("applications")
        .update({
          score: passed ? 100 : 0,
          scoreBreakdown: breakdown as object,
          passingThreshold: 1,
          status: decision,
          updatedAt: now(),
        })
        .eq("id", appId);

      if (decision === "APPROVED") {
        await supabase
          .from("users")
          .update({ status: "APPROVED", updatedAt: now() })
          .eq("id", userId);
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
