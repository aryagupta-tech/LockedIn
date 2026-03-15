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

    if (!["APPROVED", "REJECTED", "UNDER_REVIEW"].includes(decision)) {
      return errorResponse("Invalid decision", "VALIDATION_ERROR", 400);
    }

    const supabase = createServiceClient();

    const { data: application } = await supabase
      .from("applications")
      .select("id, userId")
      .eq("id", id)
      .single();

    if (!application) {
      return errorResponse("Application not found", "NOT_FOUND", 404);
    }

    const ts = now();
    const { data: updated } = await supabase
      .from("applications")
      .update({
        status: decision,
        reviewerId: auth.user.id,
        reviewNote: note || null,
        reviewedAt: ts,
        updatedAt: ts,
      })
      .eq("id", id)
      .select()
      .single();

    if (decision === "APPROVED") {
      await supabase
        .from("users")
        .update({ status: "APPROVED", updatedAt: ts })
        .eq("id", application.userId);
    } else if (decision === "REJECTED") {
      await supabase
        .from("users")
        .update({ status: "REJECTED", updatedAt: ts })
        .eq("id", application.userId);
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Admin review application error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
