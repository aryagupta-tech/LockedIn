import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireApproved, requireAuth, errorResponse, generateId, now } from "@/lib/api-utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireApproved(request);
    if ("error" in auth) return auth.error;

    const { id: postId } = await params;
    const supabase = createServiceClient();

    const { data: post } = await supabase.from("posts").select("id").eq("id", postId).single();
    if (!post) return errorResponse("Post not found", "NOT_FOUND", 404);

    const { error } = await supabase.from("post_bookmarks").insert({
      id: generateId(),
      postId,
      userId: auth.user.id,
      createdAt: now(),
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ saved: true, already: true });
      }
      throw error;
    }

    return NextResponse.json({ saved: true });
  } catch (e) {
    console.error("Bookmark error:", e);
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

    const { id: postId } = await params;
    const supabase = createServiceClient();

    const { count } = await supabase
      .from("post_bookmarks")
      .delete({ count: "exact" })
      .eq("postId", postId)
      .eq("userId", auth.user.id);

    if (!count) return NextResponse.json({ removed: false });
    return NextResponse.json({ removed: true });
  } catch (e) {
    console.error("Unbookmark error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
