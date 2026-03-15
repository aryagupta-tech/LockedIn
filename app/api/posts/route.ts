import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireApproved, errorResponse, generateId, now } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    const auth = await requireApproved(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { content, codeSnippet, codeLanguage, communityId } = body;

    if (!content) return errorResponse("Content is required", "VALIDATION_ERROR", 400);

    const supabase = createServiceClient();

    if (communityId) {
      const { data: membership } = await supabase
        .from("community_members").select("id")
        .eq("communityId", communityId).eq("userId", auth.user.id).maybeSingle();
      if (!membership) return errorResponse("You must be a community member to post", "FORBIDDEN", 403);
    }

    const ts = now();
    const postId = generateId();

    await supabase.from("posts").insert({
      id: postId, authorId: auth.user.id, content,
      codeSnippet: codeSnippet || null, codeLanguage: codeLanguage || null,
      communityId: communityId || null, likesCount: 0, commentsCount: 0,
      createdAt: ts, updatedAt: ts,
    });

    const { data: author } = await supabase
      .from("users").select("id, username, displayName, avatarUrl").eq("id", auth.user.id).single();

    return NextResponse.json({
      id: postId, content, codeSnippet: codeSnippet || null,
      codeLanguage: codeLanguage || null, communityId: communityId || null,
      likesCount: 0, commentsCount: 0, author, createdAt: ts,
    }, { status: 201 });
  } catch (e) {
    console.error("Create post error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
