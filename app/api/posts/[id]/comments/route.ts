import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireApproved, errorResponse, generateId, now } from "@/lib/api-utils";
import { bumpPostComments } from "@/lib/post-counter-bump";
import type { SupabaseClient } from "@supabase/supabase-js";

async function syncCommentCount(supabase: SupabaseClient, postId: string) {
  const { count } = await supabase
    .from("comments").select("*", { count: "exact", head: true }).eq("postId", postId);
  await supabase.from("posts").update({ commentsCount: count || 0, updatedAt: now() }).eq("id", postId);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await params;
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    const { data: comments } = await supabase
      .from("comments").select("*").eq("postId", postId).is("parentId", null)
      .order("createdAt", { ascending: false }).range(offset, offset + limit - 1);

    if (!comments || comments.length === 0) return NextResponse.json([]);

    const authorIds = [...new Set(comments.map((c) => c.authorId))];
    const commentIds = comments.map((c) => c.id);

    const [, repliesRes] = await Promise.all([
      supabase.from("users").select("id, username, displayName, avatarUrl").in("id", authorIds),
      supabase.from("comments").select("*").in("parentId", commentIds)
        .order("createdAt", { ascending: true }),
    ]);

    const allAuthorIds = [
      ...authorIds,
      ...new Set((repliesRes.data || []).map((r) => r.authorId)),
    ];
    const { data: allAuthors } = await supabase
      .from("users").select("id, username, displayName, avatarUrl").in("id", [...new Set(allAuthorIds)]);

    const authorMap = new Map((allAuthors || []).map((a) => [a.id, a]));

    const repliesByParent = new Map<string, unknown[]>();
    for (const reply of repliesRes.data || []) {
      const arr = repliesByParent.get(reply.parentId) || [];
      arr.push({ ...reply, author: authorMap.get(reply.authorId) || null });
      repliesByParent.set(reply.parentId, arr);
    }

    const result = comments.map((c) => ({
      ...c,
      author: authorMap.get(c.authorId) || null,
      replies: (repliesByParent.get(c.id) || []).slice(0, 5),
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("Get comments error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireApproved(request);
    if ("error" in auth) return auth.error;

    const { id: postId } = await params;
    const body = await request.json();
    const { content, parentId } = body;

    if (!content) return errorResponse("Content is required", "VALIDATION_ERROR", 400);

    const supabase = createServiceClient();

    const { data: post } = await supabase.from("posts").select("id").eq("id", postId).single();
    if (!post) return errorResponse("Post not found", "NOT_FOUND", 404);

    const ts = now();
    const commentId = generateId();

    await supabase.from("comments").insert({
      id: commentId, postId, authorId: auth.user.id,
      content, parentId: parentId || null, createdAt: ts, updatedAt: ts,
    });

    await bumpPostComments(supabase, postId, 1, () => syncCommentCount(supabase, postId));

    const { data: author } = await supabase
      .from("users").select("id, username, displayName, avatarUrl").eq("id", auth.user.id).single();

    return NextResponse.json(
      { id: commentId, postId, authorId: auth.user.id, content, parentId: parentId || null, author, createdAt: ts },
      { status: 201 },
    );
  } catch (e) {
    console.error("Add comment error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
