import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse, generateId, now } from "@/lib/api-utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ param: string; requestId: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { param: communityId, requestId } = await params;
    const body = await request.json();
    const { decision } = body;

    if (!["APPROVED", "REJECTED"].includes(decision)) {
      return errorResponse("Invalid decision", "VALIDATION_ERROR", 400);
    }

    const supabase = createServiceClient();

    const { data: joinRequest } = await supabase
      .from("community_join_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (!joinRequest) {
      return errorResponse(`Join request '${requestId}' not found`, "NOT_FOUND", 404);
    }

    const { data: membership } = await supabase
      .from("community_members")
      .select("role")
      .eq("communityId", communityId)
      .eq("userId", auth.user.id)
      .single();

    if (!membership || membership.role === "MEMBER") {
      return errorResponse("Only owners and moderators can review requests", "FORBIDDEN", 403);
    }

    await supabase
      .from("community_join_requests")
      .update({ status: decision, reviewerId: auth.user.id, reviewedAt: now() })
      .eq("id", requestId);

    if (decision === "APPROVED") {
      await supabase.from("community_members").insert({
        id: generateId(),
        communityId: joinRequest.communityId,
        userId: joinRequest.userId,
        role: "MEMBER",
        joinedAt: now(),
      });

      const { count } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("communityId", joinRequest.communityId);

      await supabase
        .from("communities")
        .update({ memberCount: count || 0, updatedAt: now() })
        .eq("id", joinRequest.communityId);
    }

    return NextResponse.json({ status: decision });
  } catch (e) {
    console.error("Review join request error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
