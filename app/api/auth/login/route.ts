import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { errorResponse } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("Missing required fields", "VALIDATION_ERROR", 400);
    }

    const supabase = createServiceClient();

    const { data: session, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error || !session.session) {
      return errorResponse("Invalid email or password", "UNAUTHORIZED", 401);
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, email, username, displayName, avatarUrl, role, status")
      .eq("id", session.user.id)
      .single();

    if (!user) {
      return errorResponse("Profile not found. Please register first.", "UNAUTHORIZED", 401);
    }

    if (user.status === "BANNED") {
      return errorResponse("This account has been suspended", "UNAUTHORIZED", 401);
    }

    return NextResponse.json({
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      expiresIn: session.session.expires_in,
      user,
    });
  } catch (e) {
    console.error("Login error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
