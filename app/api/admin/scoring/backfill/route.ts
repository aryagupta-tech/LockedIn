import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAdmin, errorResponse, now } from "@/lib/api-utils";
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
    "Auto-approve if ANY: GitHub ≥250 OR LeetCode ≥100 OR Codeforces ≥900 OR Codolio C-Score ≥600 — proofs must match GitHub sign-in / CF org phrase / Codolio-linked GitHub.";

  return breakdown;
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const supabase = createServiceClient();

    const { data: applications } = await supabase
      .from("applications")
      .select("*")
      .eq("status", "UNDER_REVIEW");

    if (!applications || applications.length === 0) {
      return NextResponse.json({
        queued: 0,
        message: "No applications to re-score",
      });
    }

    let scored = 0;
    let skipped = 0;
    for (const app of applications) {
      try {
        const { data: dbUser } = await supabase
          .from("users")
          .select("id, githubUsername")
          .eq("id", app.userId as string)
          .single();

        if (!dbUser) {
          console.warn(`Backfill skip ${app.id}: user row missing`);
          skipped++;
          continue;
        }

        const violation = await validatePlatformOwnership(
          {
            githubUrl: (app.githubUrl as string | null) || undefined,
            codeforcesHandle: (app.codeforcesHandle as string | null) || undefined,
            leetcodeHandle: (app.leetcodeHandle as string | null) || undefined,
            codolioProfile: (app.codolioProfile as string | null) || undefined,
          },
          dbUser,
        );
        if (violation) {
          console.warn(
            `Backfill skip ${app.id} (${violation.code}): ${violation.message}`,
          );
          skipped++;
          continue;
        }

        const { signals, errors: fetchErrors } = await fetchApplicationSignals(
          app as {
            githubUrl?: string | null;
            codeforcesHandle?: string | null;
            leetcodeHandle?: string | null;
            codolioProfile?: string | null;
          },
        );

        const passed = checkAnyPlatformPasses(signals);
        const decision = passed ? "APPROVED" : "UNDER_REVIEW";
        const breakdown = buildScoreBreakdown(signals, fetchErrors);

        const ts = now();
        await supabase
          .from("applications")
          .update({
            score: passed ? 100 : 0,
            scoreBreakdown: breakdown as object,
            passingThreshold: 1,
            status: decision,
            updatedAt: ts,
          })
          .eq("id", app.id);

        if (decision === "APPROVED") {
          await supabase
            .from("users")
            .update({ status: "APPROVED", updatedAt: ts })
            .eq("id", app.userId);
        }
        scored++;
      } catch (err) {
        console.error(`Failed to re-score application ${app.id}:`, err);
      }
    }

    return NextResponse.json({
      queued: scored,
      skipped,
      message: `${scored} applications re-scored, ${skipped} skipped (ownership / config)`,
    });
  } catch (e) {
    console.error("Backfill error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
