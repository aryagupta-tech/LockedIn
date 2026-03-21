import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse, now } from "@/lib/api-utils";
import { parseApplicationProofBody } from "@/lib/application-body";
import { ensurePublicUserRow } from "@/lib/ensure-public-user";
import { validatePlatformOwnership } from "@/lib/verification/platform-ownership";
import {
  APPLICATION_UPDATABLE_STATUSES,
  scoreAndPersistApplication,
} from "@/lib/application-scoring";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const supabase = createServiceClient();
    const { data } = await supabase
      .from("applications")
      .select("*")
      .eq("userId", auth.user.id)
      .order("createdAt", { ascending: false });

    return NextResponse.json(data || []);
  } catch (e) {
    console.error("Get applications error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}

/**
 * Replace proof links on your latest application and re-fetch GitHub / LeetCode /
 * Codeforces stats (same checks as initial submit). Use when numbers were wrong
 * or you want different proof handles — still must match your sign-in GitHub for URL.
 */
export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const userId = auth.user.id;

    const body = await request.json();
    const parsed = parseApplicationProofBody(body);
    if (!parsed.ok) return parsed.response;
    const { gh, cfRaw, lcRaw, cf, lc } = parsed.data;

    const supabase = createServiceClient();
    await ensurePublicUserRow(supabase, auth.user);

    const { data: latest, error: appErr } = await supabase
      .from("applications")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (appErr || !latest) {
      return errorResponse("No application found to update.", "NOT_FOUND", 404);
    }

    if (!APPLICATION_UPDATABLE_STATUSES.has(latest.status)) {
      return errorResponse(
        "This application can’t be updated from here (already approved or locked).",
        "FORBIDDEN",
        403,
      );
    }

    const { data: dbUser, error: profErr } = await supabase
      .from("users")
      .select("id, githubUsername")
      .eq("id", userId)
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

    const { error: updErr } = await supabase
      .from("applications")
      .update({
        githubUrl: gh || null,
        codeforcesHandle: cf || null,
        leetcodeHandle: lc || null,
        status: "PROCESSING",
        updatedAt: now(),
      })
      .eq("id", latest.id);

    if (updErr) {
      console.error("applications PATCH update failed:", updErr);
      return errorResponse("Could not update application", "DB_ERROR", 500, {
        details: updErr.message,
      });
    }

    const scored = await scoreAndPersistApplication(supabase, {
      appId: latest.id,
      userId,
      githubUrl: gh || null,
      codeforcesHandle: cf || null,
      leetcodeHandle: lc || null,
    });

    const { data: fresh, error: freshErr } = await supabase
      .from("applications")
      .select("*")
      .eq("id", latest.id)
      .single();

    if (freshErr || !fresh) {
      return NextResponse.json({
        id: latest.id,
        userId,
        status: scored.status,
        score: scored.score,
        scoreBreakdown: scored.scoreBreakdown,
        githubUrl: gh || null,
        codeforcesHandle: cf || null,
        leetcodeHandle: lc || null,
      });
    }

    return NextResponse.json(fresh);
  } catch (e) {
    console.error("PATCH applications/me error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
