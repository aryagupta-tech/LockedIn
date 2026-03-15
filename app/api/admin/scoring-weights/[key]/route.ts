import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAdmin, errorResponse, now } from "@/lib/api-utils";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const { key } = await params;
    const body = await request.json();

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("scoring_weights")
      .select("id")
      .eq("key", key)
      .single();

    if (!existing) {
      return errorResponse("Scoring weight not found", "NOT_FOUND", 404);
    }

    const update: Record<string, unknown> = {
      updatedById: auth.user.id,
      updatedAt: now(),
    };
    if (body.weight !== undefined) update.weight = body.weight;
    if (body.threshold !== undefined) update.threshold = body.threshold;
    if (body.minimum !== undefined) update.minimum = body.minimum;

    const { data: updated } = await supabase
      .from("scoring_weights")
      .update(update)
      .eq("key", key)
      .select()
      .single();

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Update weight error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
