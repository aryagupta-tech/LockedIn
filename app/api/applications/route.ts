import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse, generateId, now } from "@/lib/api-utils";
import { validatePlatformOwnership } from "@/lib/verification/platform-ownership";
import { scoreAndPersistApplication } from "@/lib/application-scoring";
import { parseApplicationProofBody } from "@/lib/application-body";
import { ensurePublicUserRow } from "@/lib/ensure-public-user";

export async function POST(request: Request) {
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
    // DB often has NOT NULL on score / passingThreshold — use placeholders until scoring runs.
    const application: Record<string, unknown> = {
      id: appId,
      userId,
      status: "PROCESSING",
      githubUrl: gh || null,
      codeforcesHandle: cf || null,
      leetcodeHandle: lc || null,
      portfolioUrl: null,
      score: 0,
      scoreBreakdown: null,
      passingThreshold: 1,
      createdAt: ts,
      updatedAt: ts,
    };

    const { error: insertError } = await supabase
      .from("applications")
      .insert(application);
    if (insertError) {
      console.error("applications insert failed:", insertError);
      const hint =
        insertError.code === "23505"
          ? "You may already have an application — refresh the page. If not, ask an admin to check for a duplicate row."
          : "The database rejected the insert. Ask an admin to confirm the `applications` table matches the app (columns + RLS / service role).";
      return errorResponse(
        "Could not save your application.",
        "DB_ERROR",
        500,
        {
          details: insertError.message,
          hint,
          dbCode: insertError.code,
        },
      );
    }

    const scored = await scoreAndPersistApplication(supabase, {
      appId,
      userId,
      githubUrl: application.githubUrl as string | null,
      codeforcesHandle: application.codeforcesHandle as string | null,
      leetcodeHandle: application.leetcodeHandle as string | null,
    });
    application.score = scored.score;
    application.scoreBreakdown = scored.scoreBreakdown;
    application.passingThreshold = 1;
    application.status = scored.status;

    return NextResponse.json(application, { status: 201 });
  } catch (e) {
    console.error("Application error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
