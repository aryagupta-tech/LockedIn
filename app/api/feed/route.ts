import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireApproved, errorResponse } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const auth = await requireApproved(request);
    if ("error" in auth) return auth.error;

    const userId = auth.user.id;
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));

    const supabase = createServiceClient();

    const [followsRes, membershipsRes] = await Promise.all([
      supabase.from("follows").select("followingId").eq("followerId", userId),
      supabase.from("community_members").select("communityId").eq("userId", userId),
    ]);

    const followedIds = (followsRes.data || []).map((r) => r.followingId);
    const communityIds = (membershipsRes.data || []).map((r) => r.communityId);
    const authorIds = [...new Set([...followedIds, userId])];

    let query = supabase
      .from("posts")
      .select("*")
      .order("createdAt", { ascending: false })
      .limit(limit + 1);

    const filters: string[] = [];
    if (authorIds.length > 0) {
      filters.push(`authorId.in.(${authorIds.join(",")})`);
    }
    if (communityIds.length > 0) {
      filters.push(`communityId.in.(${communityIds.join(",")})`);
    }

    if (filters.length > 0) {
      query = query.or(filters.join(","));
    } else {
      query = query.eq("authorId", userId);
    }

    if (cursor) {
      query = query.lt("createdAt", cursor);
    }

    const { data: posts } = await query;

    if (!posts || posts.length === 0) {
      return NextResponse.json({ items: [], nextCursor: null, hasMore: false });
    }

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? items[items.length - 1].createdAt : null;

    const postAuthorIds = [...new Set(items.map((p) => p.authorId))];
    const postCommunityIds = [...new Set(items.map((p) => p.communityId).filter(Boolean))] as string[];

    const [authorsRes, communitiesRes, likesRes] = await Promise.all([
      supabase.from("users").select("id, username, displayName, avatarUrl").in("id", postAuthorIds),
      postCommunityIds.length > 0
        ? supabase.from("communities").select("id, name, slug").in("id", postCommunityIds)
        : Promise.resolve({ data: [] }),
      supabase.from("post_likes").select("postId").eq("userId", userId).in("postId", items.map((p) => p.id)),
    ]);

    const authorMap = new Map((authorsRes.data || []).map((a) => [a.id, a]));
    const communityMap = new Map((communitiesRes.data || []).map((c) => [c.id, c]));
    const likedSet = new Set((likesRes.data || []).map((l) => l.postId));

    const enriched = items.map((p) => ({
      ...p,
      author: authorMap.get(p.authorId) || null,
      community: p.communityId ? communityMap.get(p.communityId) || null : null,
      hasLiked: likedSet.has(p.id),
    }));

    return NextResponse.json({ items: enriched, nextCursor, hasMore });
  } catch (e) {
    console.error("Feed error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
