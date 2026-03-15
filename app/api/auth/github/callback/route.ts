import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { errorResponse, now } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { access_token, refresh_token } = body;

    if (!access_token || !refresh_token) {
      return errorResponse("Missing tokens", "VALIDATION_ERROR", 400);
    }

    const supabase = createServiceClient();

    const { data: session, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error || !session.session) {
      return errorResponse("GitHub authentication failed", "UNAUTHORIZED", 401);
    }

    const supaUser = session.user!;
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email, username, displayName, avatarUrl, role, status, githubUsername")
      .eq("id", supaUser.id)
      .single();

    let user = existingUser;

    if (!user) {
      const meta = supaUser.user_metadata || {};
      let username = (
        meta.user_name || meta.preferred_username || supaUser.email?.split("@")[0] || "user"
      ).toLowerCase().replace(/[^a-z0-9_]/g, "_");

      const { data: taken } = await supabase
        .from("users").select("id").eq("username", username).maybeSingle();
      if (taken) username = `${username}_${supaUser.id.slice(0, 6)}`;

      const ts = now();
      const newUser = {
        id: supaUser.id,
        email: (supaUser.email || `${username}@github.user`).toLowerCase(),
        username,
        displayName: meta.full_name || meta.name || username,
        avatarUrl: meta.avatar_url || null,
        githubId: meta.provider_id ? parseInt(meta.provider_id) : null,
        githubUsername: meta.user_name || null,
        createdAt: ts,
        updatedAt: ts,
      };

      await supabase.from("users").insert(newUser);

      user = {
        id: newUser.id, email: newUser.email, username: newUser.username,
        displayName: newUser.displayName, avatarUrl: newUser.avatarUrl,
        role: "USER", status: "PENDING", githubUsername: newUser.githubUsername,
      };
    } else {
      const meta = supaUser.user_metadata || {};
      if (meta.avatar_url && !user.avatarUrl) {
        await supabase.from("users")
          .update({ avatarUrl: meta.avatar_url, githubUsername: meta.user_name || user.githubUsername, updatedAt: now() })
          .eq("id", user.id);
        user = { ...user, avatarUrl: meta.avatar_url };
      }
    }

    if (user.status === "BANNED") {
      return errorResponse("This account has been suspended", "UNAUTHORIZED", 401);
    }

    return NextResponse.json({
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      expiresIn: session.session.expires_in,
      user: {
        id: user.id, email: user.email, username: user.username,
        displayName: user.displayName, avatarUrl: user.avatarUrl,
        role: user.role, status: user.status,
      },
    });
  } catch (e) {
    console.error("GitHub callback error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
