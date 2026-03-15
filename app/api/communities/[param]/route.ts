import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { errorResponse } from "@/lib/api-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ param: string }> },
) {
  try {
    const { param: slug } = await params;
    const supabase = createServiceClient();

    const { data: community } = await supabase
      .from("communities").select("*").eq("slug", slug).single();
    if (!community) return errorResponse("Community not found", "NOT_FOUND", 404);

    const { data: owner } = await supabase
      .from("users").select("id, username, displayName").eq("id", community.ownerId).single();

    return NextResponse.json({ ...community, owner });
  } catch (e) {
    console.error("Get community error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
