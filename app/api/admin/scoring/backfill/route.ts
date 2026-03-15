import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAdmin, errorResponse, now } from "@/lib/api-utils";
import { computeScore, deriveDecision } from "@/lib/scoring/engine";
import type { SignalInput, WeightConfig } from "@/lib/scoring/engine";
import { fetchGitHubSignal } from "@/lib/scoring/providers/github";
import { fetchCodeforcesSignal } from "@/lib/scoring/providers/codeforces";
import { fetchLeetCodeSignal } from "@/lib/scoring/providers/leetcode";

function extractGitHubUsername(input: string): string | null {
  if (input.includes("github.com/")) {
    const parts = input.split("github.com/");
    return parts[1]?.split("/")[0]?.split("?")[0] || null;
  }
  return input.trim() || null;
}

async function fetchSignals(app: {
  githubUrl?: string | null;
  codeforcesHandle?: string | null;
  leetcodeHandle?: string | null;
}): Promise<SignalInput[]> {
  const signals: SignalInput[] = [];
  if (app.githubUrl) {
    const u = extractGitHubUsername(app.githubUrl);
    if (u) { try { signals.push(await fetchGitHubSignal(u)); } catch { /* skip */ } }
  }
  if (app.codeforcesHandle) {
    try { signals.push(await fetchCodeforcesSignal(app.codeforcesHandle)); } catch { /* skip */ }
  }
  if (app.leetcodeHandle) {
    try { signals.push(await fetchLeetCodeSignal(app.leetcodeHandle)); } catch { /* skip */ }
  }
  return signals;
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const supabase = createServiceClient();
    const passThreshold = Number(process.env.SCORING_PASS_THRESHOLD) || 70;
    const autoApprove = Number(process.env.SCORING_AUTO_APPROVE_THRESHOLD) || 90;
    const autoReject = Number(process.env.SCORING_AUTO_REJECT_THRESHOLD) || 30;

    const { data: applications } = await supabase
      .from("applications")
      .select("*")
      .eq("status", "UNDER_REVIEW");

    if (!applications || applications.length === 0) {
      return NextResponse.json({ queued: 0, message: "No applications to re-score" });
    }

    const { data: weightRows } = await supabase
      .from("scoring_weights")
      .select("key, weight, threshold, minimum");

    const weights: WeightConfig[] = (weightRows || []).map((r) => ({
      key: r.key, weight: r.weight, threshold: r.threshold, minimum: r.minimum,
    }));

    let scored = 0;
    for (const app of applications) {
      try {
        const signals = await fetchSignals(app);
        const result = computeScore(signals, weights, passThreshold);
        const decision = deriveDecision(result.score, autoApprove, autoReject);

        const ts = now();
        await supabase
          .from("applications")
          .update({
            score: result.score,
            scoreBreakdown: result.breakdown as object,
            passingThreshold: passThreshold,
            status: decision,
            updatedAt: ts,
          })
          .eq("id", app.id);

        if (decision === "APPROVED") {
          await supabase.from("users").update({ status: "APPROVED", updatedAt: ts }).eq("id", app.userId);
        } else if (decision === "REJECTED") {
          await supabase.from("users").update({ status: "REJECTED", updatedAt: ts }).eq("id", app.userId);
        }
        scored++;
      } catch (err) {
        console.error(`Failed to re-score application ${app.id}:`, err);
      }
    }

    return NextResponse.json({ queued: scored, message: `${scored} applications re-scored` });
  } catch (e) {
    console.error("Backfill error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
