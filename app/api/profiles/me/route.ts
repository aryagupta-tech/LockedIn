import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse, now } from "@/lib/api-utils";
import { getBuilderProgressForUser } from "@/lib/gamification-queries";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const supabase = createServiceClient();
    const { data: user } = await supabase
      .from("users")
      .select("id, email, username, displayName, avatarUrl, role, status, createdAt")
      .eq("id", auth.user.id)
      .single();

    if (!user) return errorResponse("User not found", "NOT_FOUND", 404);

    const builder = await getBuilderProgressForUser(
      supabase,
      user.id,
      { status: user.status, createdAt: user.createdAt },
    );

    return NextResponse.json({ ...user, builder });
  } catch (e) {
    console.error("Get profile error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const allowed = ["displayName", "bio", "avatarUrl", "codeforcesHandle", "leetcodeHandle"];
    const update: Record<string, unknown> = { updatedAt: now() };
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const supabase = createServiceClient();
    const { data: user } = await supabase
      .from("users")
      .update(update)
      .eq("id", auth.user.id)
      .select("id, username, displayName, avatarUrl, bio, githubUsername, codeforcesHandle, leetcodeHandle, role, createdAt")
      .single();

    return NextResponse.json(user);
  } catch (e) {
    console.error("Update profile error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
