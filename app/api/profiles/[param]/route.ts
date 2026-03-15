import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, errorResponse } from "@/lib/api-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ param: string }> },
) {
  try {
    const { param: username } = await params;
    const supabase = createServiceClient();

    const { data: user } = await supabase
      .from("users")
      .select("id, username, displayName, avatarUrl, bio, githubUsername, codeforcesHandle, leetcodeHandle, portfolioUrl, role, status, createdAt")
      .eq("username", username)
      .single();

    if (!user) return errorResponse("Profile not found", "NOT_FOUND", 404);

    const [followersRes, followingRes, postsRes] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("followingId", user.id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("followerId", user.id),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("authorId", user.id),
    ]);

    let isFollowing: boolean | undefined;
    const viewer = await getAuthUser(request);
    if (viewer && viewer.id !== user.id) {
      const { data: follow } = await supabase
        .from("follows").select("id").eq("followerId", viewer.id).eq("followingId", user.id).maybeSingle();
      isFollowing = !!follow;
    }

    return NextResponse.json({
      ...user,
      followersCount: followersRes.count || 0,
      followingCount: followingRes.count || 0,
      postsCount: postsRes.count || 0,
      isFollowing,
    });
  } catch (e) {
    console.error("Get profile error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
