import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { errorResponse } from "@/lib/api-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ param: string }> },
) {
  try {
    const { param: communityId } = await params;
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    const { data: members } = await supabase
      .from("community_members").select("*").eq("communityId", communityId)
      .order("joinedAt", { ascending: false }).range(offset, offset + limit - 1);

    if (!members || members.length === 0) return NextResponse.json([]);

    const userIds = members.map((m) => m.userId);
    const { data: users } = await supabase
      .from("users").select("id, username, displayName, avatarUrl").in("id", userIds);

    const userMap = new Map((users || []).map((u) => [u.id, u]));
    const result = members.map((m) => ({ ...m, user: userMap.get(m.userId) || null }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("List members error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
