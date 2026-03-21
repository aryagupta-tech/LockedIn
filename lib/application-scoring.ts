import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAnyPlatformPasses, PLATFORM_THRESHOLDS } from "@/lib/scoring/engine";
import type { SignalInput } from "@/lib/scoring/engine";
import { fetchApplicationSignals } from "@/lib/scoring/fetch-application-signals";
import { now } from "@/lib/api-utils";

export function buildScoreBreakdown(
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
    "Auto-approve if ANY: GitHub ≥250 contributions OR LeetCode ≥100 solved OR Codeforces rating ≥900 — each proof must be tied to your GitHub sign-in (see ownership rules).";

  breakdown._statsFetchedAt = new Date().toISOString();

  return breakdown;
}

type ScoreAppArgs = {
  appId: string;
  userId: string;
  githubUrl: string | null;
  codeforcesHandle: string | null;
  leetcodeHandle: string | null;
};

/**
 * Re-fetches platform signals and updates application row (+ user if auto-approved).
 */
export async function scoreAndPersistApplication(
  supabase: SupabaseClient,
  args: ScoreAppArgs,
): Promise<{ status: string; score: number; scoreBreakdown: Record<string, unknown> }> {
  const { appId, userId, githubUrl, codeforcesHandle, leetcodeHandle } = args;

  try {
    const { signals, errors: fetchErrors } = await fetchApplicationSignals({
      githubUrl,
      codeforcesHandle,
      leetcodeHandle,
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

    return {
      status: decision,
      score: passed ? 100 : 0,
      scoreBreakdown: breakdown,
    };
  } catch (scoringErr) {
    console.error("Scoring failed, setting to UNDER_REVIEW:", scoringErr);
    try {
      const { signals, errors: fe } = await fetchApplicationSignals({
        githubUrl,
        codeforcesHandle,
        leetcodeHandle,
      });
      const breakdown = buildScoreBreakdown(signals, fe);
      await supabase
        .from("applications")
        .update({
          status: "UNDER_REVIEW",
          score: 0,
          scoreBreakdown: breakdown as object,
          passingThreshold: 1,
          updatedAt: now(),
        })
        .eq("id", appId);
      return { status: "UNDER_REVIEW", score: 0, scoreBreakdown: breakdown };
    } catch (fallbackErr) {
      console.error("Fallback scoring breakdown save failed:", fallbackErr);
      await supabase
        .from("applications")
        .update({ status: "UNDER_REVIEW", updatedAt: now() })
        .eq("id", appId);
      return {
        status: "UNDER_REVIEW",
        score: 0,
        scoreBreakdown: buildScoreBreakdown([], {
          scoring: "Could not compute score breakdown; try Update proof & refresh stats.",
        }),
      };
    }
  }
}

/** Statuses where the applicant may replace proof links and re-run scoring. */
export const APPLICATION_UPDATABLE_STATUSES = new Set([
  "PENDING",
  "PROCESSING",
  "UNDER_REVIEW",
  "REJECTED",
  "APPEALED",
]);
