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

    const { data: application } = await supabase
      .from("applications").select("*").eq("id", id).single();

    if (!application) {
      return errorResponse("Application not found", "NOT_FOUND", 404);
    }

    const { data: profile } = await supabase
      .from("users").select("role").eq("id", auth.user.id).single();

    if (application.userId !== auth.user.id && profile?.role !== "ADMIN") {
      return errorResponse("Insufficient permissions", "FORBIDDEN", 403);
    }

    return NextResponse.json(application);
  } catch (e) {
    console.error("Get application error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
