import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireApproved, errorResponse, generateId, now } from "@/lib/api-utils";

async function admitMember(communityId: string, userId: string) {
  const supabase = createServiceClient();
  await supabase.from("community_members").insert({
    id: generateId(), communityId, userId, role: "MEMBER", joinedAt: now(),
  });
  const { count } = await supabase
    .from("community_members").select("*", { count: "exact", head: true }).eq("communityId", communityId);
  await supabase.from("communities").update({ memberCount: count || 0, updatedAt: now() }).eq("id", communityId);
  return { status: "APPROVED" };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ param: string }> },
) {
  try {
    const auth = await requireApproved(request);
    if ("error" in auth) return auth.error;

    const { param: communityId } = await params;
    const supabase = createServiceClient();

    const { data: community } = await supabase
      .from("communities").select("id, isPrivate, gatingCriteria").eq("id", communityId).single();
    if (!community) return errorResponse("Community not found", "NOT_FOUND", 404);

    const { data: isMember } = await supabase
      .from("community_members").select("id")
      .eq("communityId", communityId).eq("userId", auth.user.id).maybeSingle();
    if (isMember) return errorResponse("Already a member", "CONFLICT", 409);

    if (!community.isPrivate && !community.gatingCriteria) {
      const result = await admitMember(communityId, auth.user.id);
      return NextResponse.json(result);
    }

    if (community.gatingCriteria) {
      const criteria = community.gatingCriteria as { minScore?: number };
      if (criteria.minScore) {
        const { data: latestApp } = await supabase
          .from("applications").select("score").eq("userId", auth.user.id).eq("status", "APPROVED")
          .order("createdAt", { ascending: false }).limit(1).maybeSingle();
        if (latestApp?.score && latestApp.score >= criteria.minScore) {
          const result = await admitMember(communityId, auth.user.id);
          return NextResponse.json(result);
        }
      }
    }

    const { error } = await supabase.from("community_join_requests").insert({
      id: generateId(), communityId, userId: auth.user.id, createdAt: now(),
    });
    if (error) {
      if (error.code === "23505") return errorResponse("Join request already pending", "CONFLICT", 409);
      throw error;
    }

    return NextResponse.json({ status: "PENDING" });
  } catch (e) {
    console.error("Join community error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
