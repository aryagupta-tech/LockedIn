import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { errorResponse } from "@/lib/api-utils";
import { ensurePublicUserRow } from "@/lib/ensure-public-user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return errorResponse("Missing refresh token", "VALIDATION_ERROR", 400);
    }

    const supabase = createServiceClient();

    const { data: session, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !session.session) {
      return errorResponse("Invalid or expired refresh token", "UNAUTHORIZED", 401);
    }

    await ensurePublicUserRow(supabase, session.user!);

    const { data: user } = await supabase
      .from("users")
      .select("id, email, username, displayName, avatarUrl, role, status")
      .eq("id", session.user!.id)
      .single();

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
