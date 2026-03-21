import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { errorResponse, now } from "@/lib/api-utils";
import {
  extractGitHubLoginFromSupabaseUser,
  extractGitHubNumericIdFromSupabaseUser,
} from "@/lib/github-auth-metadata";
import { pickAvailableUsername } from "@/lib/username-holds";

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

    const meta = supaUser.user_metadata || {};
    const ghLoginRaw = extractGitHubLoginFromSupabaseUser(supaUser);
    const ghLogin = ghLoginRaw ? ghLoginRaw.toLowerCase() : null;
    const ghNumericId = extractGitHubNumericIdFromSupabaseUser(supaUser);

    if (!user) {
      const preferred =
        ghLoginRaw ||
        meta.preferred_username ||
        supaUser.email?.split("@")[0] ||
        "user";
      const username = await pickAvailableUsername(supabase, String(preferred), supaUser.id);

      const ts = now();
      const newUser = {
        id: supaUser.id,
        email: (supaUser.email || `${username}@github.user`).toLowerCase(),
        username,
        displayName: meta.full_name || meta.name || username,
        avatarUrl: meta.avatar_url || null,
        githubId: ghNumericId,
        githubUsername: ghLogin,
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
      // Always sync GitHub identity on OAuth callback (not only when avatar was missing).
      // DB trigger / RPC often creates public.users without githubUsername; avatar may already exist.
      const patch: Record<string, unknown> = { updatedAt: now() };
      if (meta.avatar_url) patch.avatarUrl = meta.avatar_url;
      if (ghLogin) patch.githubUsername = ghLogin;
      if (ghNumericId != null) patch.githubId = ghNumericId;

      if (Object.keys(patch).length > 1) {
        await supabase.from("users").update(patch).eq("id", user.id);
        user = {
          ...user,
          ...(patch.avatarUrl ? { avatarUrl: patch.avatarUrl as string } : {}),
          ...(ghLogin ? { githubUsername: ghLogin } : {}),
        };
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
