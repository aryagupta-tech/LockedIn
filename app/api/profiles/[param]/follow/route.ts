import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireApproved, requireAuth, errorResponse, generateId, now } from "@/lib/api-utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ param: string }> },
) {
  try {
    const auth = await requireApproved(request);
    if ("error" in auth) return auth.error;

    const { param: targetId } = await params;
    if (auth.user.id === targetId) {
      return errorResponse("Cannot follow yourself", "CONFLICT", 409);
    }

    const supabase = createServiceClient();
    const { data: target } = await supabase.from("users").select("id").eq("id", targetId).single();
    if (!target) return errorResponse("User not found", "NOT_FOUND", 404);

    const { error } = await supabase.from("follows").insert({
      id: generateId(), followerId: auth.user.id, followingId: targetId, createdAt: now(),
    });

    if (error) {
      if (error.code === "23505") return errorResponse("Already following this user", "CONFLICT", 409);
      throw error;
    }

    return NextResponse.json({ followed: true });
  } catch (e) {
    console.error("Follow error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ param: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { param: targetId } = await params;
    const supabase = createServiceClient();

    const { count } = await supabase
      .from("follows").delete({ count: "exact" })
      .eq("followerId", auth.user.id).eq("followingId", targetId);

    return NextResponse.json({ unfollowed: (count || 0) > 0 });
  } catch (e) {
    console.error("Unfollow error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
