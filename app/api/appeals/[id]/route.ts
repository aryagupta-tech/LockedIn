import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse } from "@/lib/api-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const supabase = createServiceClient();

    const { data: appeal } = await supabase.from("appeals").select("*").eq("id", id).single();
    if (!appeal) return errorResponse("Appeal not found", "NOT_FOUND", 404);

    const { data: profile } = await supabase.from("users").select("role").eq("id", auth.user.id).single();
    if (appeal.userId !== auth.user.id && profile?.role !== "ADMIN") {
      return errorResponse("Insufficient permissions", "FORBIDDEN", 403);
    }

    return NextResponse.json(appeal);
  } catch (e) {
    console.error("Get appeal error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
