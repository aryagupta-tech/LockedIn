import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireApproved, errorResponse } from "@/lib/api-utils";

/**
 * Saved posts for the current user (newest bookmark first).
 */
export async function GET(request: Request) {
  try {
    const auth = await requireApproved(request);
    if ("error" in auth) return auth.error;

    const userId = auth.user.id;
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));

    const supabase = createServiceClient();

    let q = supabase
      .from("post_bookmarks")
      .select("postId, createdAt")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      q = q.lt("createdAt", cursor);
    }

    const { data: marks, error: marksErr } = await q;
    if (marksErr) throw marksErr;

    if (!marks || marks.length === 0) {
      return NextResponse.json({ items: [], nextCursor: null, hasMore: false });
    }

    const hasMore = marks.length > limit;
    const slice = hasMore ? marks.slice(0, limit) : marks;
    const nextCursor = hasMore ? slice[slice.length - 1].createdAt : null;

    const postIds = slice.map((m) => m.postId);
    const { data: posts } = await supabase.from("posts").select("*").in("id", postIds);

    const order = new Map(postIds.map((id, i) => [id, i]));
    const sorted = (posts || []).sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );

    const postAuthorIds = [...new Set(sorted.map((p) => p.authorId))];
    const postCommunityIds = [...new Set(sorted.map((p) => p.communityId).filter(Boolean))] as string[];

    const [authorsRes, communitiesRes, likesRes] = await Promise.all([
      supabase.from("users").select("id, username, displayName, avatarUrl").in("id", postAuthorIds),
      postCommunityIds.length > 0
        ? supabase.from("communities").select("id, name, slug").in("id", postCommunityIds)
        : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
      supabase.from("post_likes").select("postId").eq("userId", userId).in("postId", postIds),
    ]);

    const authorMap = new Map((authorsRes.data || []).map((a) => [a.id, a]));
    const communityMap = new Map((communitiesRes.data || []).map((c) => [c.id, c]));
    const likedSet = new Set((likesRes.data || []).map((l) => l.postId));
    const bookmarkedSet = new Set(postIds);

    const enriched = sorted.map((p) => ({
      ...p,
      author: authorMap.get(p.authorId) || null,
      community: p.communityId ? communityMap.get(p.communityId) || null : null,
      hasLiked: likedSet.has(p.id),
      hasBookmarked: bookmarkedSet.has(p.id),
    }));

    return NextResponse.json({ items: enriched, nextCursor, hasMore });
  } catch (e) {
    console.error("Bookmarks feed error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
