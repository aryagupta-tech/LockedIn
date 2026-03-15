import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse, generateId, now } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { applicationId, reason } = body;

    if (!applicationId || !reason) {
      return errorResponse("applicationId and reason are required", "VALIDATION_ERROR", 400);
    }

    const supabase = createServiceClient();

    const { data: application } = await supabase
      .from("applications")
      .select("id, userId, status")
      .eq("id", applicationId)
      .single();

    if (!application) {
      return errorResponse("Application not found", "NOT_FOUND", 404);
    }
    if (application.userId !== auth.user.id) {
      return errorResponse("Insufficient permissions", "FORBIDDEN", 403);
    }
    if (application.status !== "REJECTED") {
      return errorResponse("Only rejected applications can be appealed", "FORBIDDEN", 403);
    }

    const { data: existingAppeal } = await supabase
      .from("appeals")
      .select("id")
      .eq("applicationId", applicationId)
      .in("status", ["PENDING", "UNDER_REVIEW"])
      .maybeSingle();

    if (existingAppeal) {
      return errorResponse("An appeal is already pending for this application", "CONFLICT", 409);
    }

    const ts = now();
    const appealId = generateId();

    await supabase.from("appeals").insert({
      id: appealId, applicationId, userId: auth.user.id, reason, createdAt: ts,
    });

    await supabase
      .from("applications")
      .update({ status: "UNDER_REVIEW", updatedAt: now() })
      .eq("id", applicationId);

    return NextResponse.json(
      { id: appealId, applicationId, reason, status: "PENDING", reviewNote: null, createdAt: ts },
      { status: 201 },
    );
  } catch (e) {
    console.error("Create appeal error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
