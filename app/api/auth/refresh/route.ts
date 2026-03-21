import { NextResponse } from "next/server";
import {
  createAnonClient,
  createServiceClientIfConfigured,
  createUserAuthedClient,
} from "@/lib/supabase-server";
import { errorResponse } from "@/lib/api-utils";
import {
  ensurePublicUserProfileWithUserJwt,
  ensurePublicUserRow,
} from "@/lib/ensure-public-user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return errorResponse("Missing refresh token", "VALIDATION_ERROR", 400);
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    ) {
      return errorResponse(
        "Server missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        "INTERNAL_ERROR",
        500,
      );
    }

    const anon = createAnonClient();

    const { data: session, error } = await anon.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !session.session) {
      return errorResponse("Invalid or expired refresh token", "UNAUTHORIZED", 401);
    }

    const authUser = session.user!;
    const accessToken = session.session.access_token;

    let ensureErr = await ensurePublicUserProfileWithUserJwt(accessToken);
    if (ensureErr) {
      const svc = createServiceClientIfConfigured();
      if (svc) {
        ensureErr = await ensurePublicUserRow(svc, authUser);
      }
    }
    if (ensureErr) {
      console.error("refresh ensure profile:", ensureErr);
    }

    const userAuthed = createUserAuthedClient(accessToken);
    let { data: user, error: userErr } = await userAuthed
      .from("users")
      .select("id, email, username, displayName, avatarUrl, role, status")
      .eq("id", authUser.id)
      .single();

    if (userErr || !user) {
      const svcRead = createServiceClientIfConfigured();
      if (svcRead) {
        const r2 = await svcRead
          .from("users")
          .select("id, email, username, displayName, avatarUrl, role, status")
          .eq("id", authUser.id)
          .single();
        user = r2.data ?? null;
        userErr = r2.error ?? null;
      }
    }

    if (!user) {
      return errorResponse("Profile not found", "UNAUTHORIZED", 401);
    }

    return NextResponse.json({
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      expiresIn: session.session.expires_in,
      user,
    });
  } catch (e) {
    console.error("Refresh error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
