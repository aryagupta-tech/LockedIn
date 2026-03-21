import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireApproved, errorResponse } from "@/lib/api-utils";

/**
 * Approved members the viewer does not follow yet (home sidebar).
 */
export async function GET(request: Request) {
  try {
    const auth = await requireApproved(request);
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit")) || 8));

    const supabase = createServiceClient();

    const { data: follows } = await supabase
      .from("follows")
      .select("followingId")
      .eq("followerId", auth.user.id);

    const followingIds = new Set((follows || []).map((r) => r.followingId));

    const { data: rows, error } = await supabase
      .from("users")
      .select("id, username, displayName, avatarUrl")
      .eq("status", "APPROVED")
      .neq("id", auth.user.id)
      .order("createdAt", { ascending: false })
      .limit(50);
    if (error) {
      console.error("Suggested profiles error:", error);
      return errorResponse("Could not load suggestions", "INTERNAL_ERROR", 500);
    }

    const items = (rows || [])
      .filter((u) => !followingIds.has(u.id))
      .slice(0, limit);

    return NextResponse.json({ items });
  } catch (e) {
    console.error("Suggested profiles error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
