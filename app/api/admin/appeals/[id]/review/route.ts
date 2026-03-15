import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAdmin, errorResponse, now } from "@/lib/api-utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const body = await request.json();
    const { decision, note } = body;

    if (!["APPROVED", "REJECTED"].includes(decision)) {
      return errorResponse("Invalid decision", "VALIDATION_ERROR", 400);
    }

    const supabase = createServiceClient();

    const { data: appeal } = await supabase
      .from("appeals")
      .select("*, applicationId, userId")
      .eq("id", id)
      .single();

    if (!appeal) {
      return errorResponse("Appeal not found", "NOT_FOUND", 404);
    }

    const ts = now();
    const { data: updated } = await supabase
      .from("appeals")
      .update({
        status: decision,
        reviewerId: auth.user.id,
        reviewNote: note || null,
        reviewedAt: ts,
      })
      .eq("id", id)
      .select()
      .single();

    if (decision === "APPROVED") {
      await supabase
        .from("applications")
        .update({ status: "APPROVED", reviewerId: auth.user.id, reviewedAt: ts, updatedAt: ts })
        .eq("id", appeal.applicationId);

      await supabase
        .from("users")
        .update({ status: "APPROVED", updatedAt: ts })
        .eq("id", appeal.userId);
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Admin review appeal error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
