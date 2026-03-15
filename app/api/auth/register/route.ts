import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { errorResponse, now } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username, password, displayName } = body;

    if (!email || !username || !password || !displayName) {
      return errorResponse("Missing required fields", "VALIDATION_ERROR", 400);
    }

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("users")
      .select("email, username")
      .or(`email.eq.${email.toLowerCase()},username.eq.${username.toLowerCase()}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const field = existing.email === email.toLowerCase() ? "email" : "username";
      return errorResponse(`A user with this ${field} already exists`, "CONFLICT", 409);
    }

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { username: username.toLowerCase(), displayName },
      });

    if (authError) {
      return errorResponse(authError.message, "CONFLICT", 409);
    }

    const ts = now();
    await supabase.from("users").insert({
      id: authData.user.id,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      displayName,
      createdAt: ts,
      updatedAt: ts,
    });

    const { data: session, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

    if (signInError || !session.session) {
      return errorResponse(
        "Account created but login failed. Please try logging in.",
        "UNAUTHORIZED",
        401,
      );
    }

    return NextResponse.json(
      {
        accessToken: session.session.access_token,
        refreshToken: session.session.refresh_token,
        expiresIn: session.session.expires_in,
        user: {
          id: authData.user.id,
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          displayName,
          avatarUrl: null,
          role: "USER",
          status: "PENDING",
        },
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("Register error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
