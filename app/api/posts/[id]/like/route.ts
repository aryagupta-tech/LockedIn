import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireApproved, requireAuth, errorResponse, generateId, now } from "@/lib/api-utils";
import { bumpPostLikes } from "@/lib/post-counter-bump";
import type { SupabaseClient } from "@supabase/supabase-js";

async function syncLikeCount(supabase: SupabaseClient, postId: string) {
  const { count } = await supabase
    .from("post_likes").select("*", { count: "exact", head: true }).eq("postId", postId);
  await supabase.from("posts").update({ likesCount: count || 0, updatedAt: now() }).eq("id", postId);
}

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

    const { error } = await supabase.from("post_likes").insert({
      id: generateId(), postId, userId: auth.user.id, createdAt: now(),
    });

    if (error) {
      if (error.code === "23505") return errorResponse("Already liked", "CONFLICT", 409);
      throw error;
    }

    await bumpPostLikes(supabase, postId, 1, () => syncLikeCount(supabase, postId));
    return NextResponse.json({ liked: true });
  } catch (e) {
    console.error("Like error:", e);
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
      .from("post_likes").delete({ count: "exact" })
      .eq("postId", postId).eq("userId", auth.user.id);

    if (!count) return NextResponse.json({ unliked: false });

    const rid = String(postId).trim();
    const { error: notifErr } = await supabase
      .from("notifications")
      .delete()
      .eq("type", "like")
      .eq("actor_id", auth.user.id)
      .eq("resource_id", rid);
    if (notifErr) {
      console.error("Unlike: failed to remove like notification:", notifErr);
    }

    await bumpPostLikes(supabase, postId, -1, () => syncLikeCount(supabase, postId));
    return NextResponse.json({ unliked: true });
  } catch (e) {
    console.error("Unlike error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
