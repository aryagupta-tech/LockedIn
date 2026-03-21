import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, requireAuth, errorResponse } from "@/lib/api-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: post } = await supabase.from("posts").select("*").eq("id", id).single();
    if (!post) return errorResponse("Post not found", "NOT_FOUND", 404);

    const { data: author } = await supabase
      .from("users").select("id, username, displayName, avatarUrl").eq("id", post.authorId).single();

    let hasLiked: boolean | undefined;
    let hasBookmarked: boolean | undefined;
    const viewer = await getAuthUser(request);
    if (viewer) {
      const [likeRes, markRes] = await Promise.all([
        supabase
          .from("post_likes")
          .select("id")
          .eq("postId", id)
          .eq("userId", viewer.id)
          .maybeSingle(),
        supabase
          .from("post_bookmarks")
          .select("id")
          .eq("postId", id)
          .eq("userId", viewer.id)
          .maybeSingle(),
      ]);
      hasLiked = !!likeRes.data;
      hasBookmarked = markRes.error ? false : !!markRes.data;
    }

    return NextResponse.json({ ...post, author, hasLiked, hasBookmarked });
  } catch (e) {
    console.error("Get post error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const supabase = createServiceClient();

    const { data: post } = await supabase.from("posts").select("authorId").eq("id", id).single();
    if (!post) return errorResponse("Post not found", "NOT_FOUND", 404);

    const { data: profile } = await supabase.from("users").select("role").eq("id", auth.user.id).single();
    if (post.authorId !== auth.user.id && profile?.role !== "ADMIN") {
      return errorResponse("Insufficient permissions", "FORBIDDEN", 403);
    }

    await supabase.from("posts").delete().eq("id", id);
    return NextResponse.json({ deleted: true });
  } catch (e) {
    console.error("Delete post error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
