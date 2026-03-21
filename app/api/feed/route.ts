import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireApproved, errorResponse } from "@/lib/api-utils";
import { isInternalStaffEmail } from "@/lib/internal-account";

export async function GET(request: Request) {
  try {
    const auth = await requireApproved(request);
    if ("error" in auth) return auth.error;

    const userId = auth.user.id;
    const viewerSeesInternal = isInternalStaffEmail(auth.user.email);
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
    // Public timeline: posts not scoped to a private community are visible to all approved members.
    filters.push("communityId.is.null");

    query = query.or(filters.join(","));

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

    const postIds = items.map((p) => p.id);
    const [authorsRes, communitiesRes, likesRes, bookmarksRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, username, displayName, avatarUrl, status, email")
        .in("id", postAuthorIds),
      postCommunityIds.length > 0
        ? supabase.from("communities").select("id, name, slug").in("id", postCommunityIds)
        : Promise.resolve({ data: [] }),
      supabase.from("post_likes").select("postId").eq("userId", userId).in("postId", postIds),
      supabase.from("post_bookmarks").select("postId").eq("userId", userId).in("postId", postIds),
    ]);

    const authorMap = new Map((authorsRes.data || []).map((a) => [a.id, a]));
    const communityMap = new Map((communitiesRes.data || []).map((c) => [c.id, c]));
    const likedSet = new Set((likesRes.data || []).map((l) => l.postId));
    const bookmarkedSet = bookmarksRes.error
      ? new Set<string>()
      : new Set((bookmarksRes.data || []).map((b) => b.postId));

    const inFollowScope = new Set(authorIds);
    const inCommunityScope = new Set(communityIds);

    const enriched = items
      .filter((p) => {
        const author = authorMap.get(p.authorId);
        if (!author) return false;
        if (p.authorId === userId) return true;
        const authorEmail = (author as { email?: string | null }).email;
        if (isInternalStaffEmail(authorEmail) && !viewerSeesInternal) return false;
        const st = (author as { status?: string }).status;
        if (st === "APPROVED") return true;
        if (inFollowScope.has(p.authorId)) return true;
        if (p.communityId && inCommunityScope.has(p.communityId)) return true;
        return false;
      })
      .map((p) => {
        const raw = authorMap.get(p.authorId);
        const author = raw
          ? (() => {
              const { status: _st, email: _em, ...pub } = raw as typeof raw & {
                status?: string;
                email?: string | null;
              };
              return pub;
            })()
          : null;
        return {
          ...p,
          author,
          community: p.communityId ? communityMap.get(p.communityId) || null : null,
          hasLiked: likedSet.has(p.id),
          hasBookmarked: bookmarkedSet.has(p.id),
        };
      });

    return NextResponse.json({ items: enriched, nextCursor, hasMore });
  } catch (e) {
    console.error("Feed error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
