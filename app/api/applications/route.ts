import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse, generateId, now } from "@/lib/api-utils";
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
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const userId = auth.user.id;

    const body = await request.json();
    const { githubUrl, codeforcesHandle, leetcodeHandle, portfolioUrl } = body;

    if (!githubUrl && !codeforcesHandle && !leetcodeHandle && !portfolioUrl) {
      return errorResponse(
        "At least one proof link (GitHub, Codeforces, LeetCode, or portfolio) is required",
        "FORBIDDEN", 403,
      );
    }

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("applications").select("id").eq("userId", userId)
      .in("status", ["PENDING", "PROCESSING", "UNDER_REVIEW"])
      .limit(1).maybeSingle();

    if (existing) {
      return errorResponse("You already have a pending application. Please wait for it to be reviewed.", "CONFLICT", 409);
    }

    const passThreshold = Number(process.env.SCORING_PASS_THRESHOLD) || 70;
    const autoApprove = Number(process.env.SCORING_AUTO_APPROVE_THRESHOLD) || 90;
    const autoReject = Number(process.env.SCORING_AUTO_REJECT_THRESHOLD) || 30;

    const ts = now();
    const appId = generateId();
    const application: Record<string, unknown> = {
      id: appId, userId, status: "PROCESSING",
      githubUrl: githubUrl || null, codeforcesHandle: codeforcesHandle || null,
      leetcodeHandle: leetcodeHandle || null, portfolioUrl: portfolioUrl || null,
      score: null, scoreBreakdown: null, passingThreshold: passThreshold,
      createdAt: ts, updatedAt: ts,
    };

    await supabase.from("applications").insert(application);

    try {
      const { data: weightRows } = await supabase.from("scoring_weights").select("key, weight, threshold, minimum");
      const weights: WeightConfig[] = (weightRows || []).map((r) => ({
        key: r.key, weight: r.weight, threshold: r.threshold, minimum: r.minimum,
      }));
      const signals = await fetchSignals(application as { githubUrl?: string | null; codeforcesHandle?: string | null; leetcodeHandle?: string | null });
      const result = computeScore(signals, weights, passThreshold);
      const decision = deriveDecision(result.score, autoApprove, autoReject);

      await supabase.from("applications").update({
        score: result.score, scoreBreakdown: result.breakdown as object,
        status: decision, updatedAt: now(),
      }).eq("id", appId);

      if (decision === "APPROVED") {
        await supabase.from("users").update({ status: "APPROVED", updatedAt: now() }).eq("id", userId);
      } else if (decision === "REJECTED") {
        await supabase.from("users").update({ status: "REJECTED", updatedAt: now() }).eq("id", userId);
      }

      application.score = result.score;
      application.scoreBreakdown = result.breakdown;
      application.status = decision;
    } catch (scoringErr) {
      console.error("Scoring failed, setting to UNDER_REVIEW:", scoringErr);
      await supabase.from("applications").update({ status: "UNDER_REVIEW", updatedAt: now() }).eq("id", appId);
      application.status = "UNDER_REVIEW";
    }

    return NextResponse.json(application, { status: 201 });
  } catch (e) {
    console.error("Application error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
