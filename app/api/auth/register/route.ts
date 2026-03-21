import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getServiceRoleKeyMisconfigurationError } from "@/lib/supabase-service-key";
import { errorResponse } from "@/lib/api-utils";
import {
  ensurePublicUserProfileWithUserJwt,
  ensurePublicUserRow,
} from "@/lib/ensure-public-user";
import { applySeedAccessRules } from "@/lib/seed-access-rules";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username, password, displayName } = body;

    if (!email || !username || !password || !displayName) {
      return errorResponse("Missing required fields", "VALIDATION_ERROR", 400);
    }

    const keyMisconfig = getServiceRoleKeyMisconfigurationError();
    if (keyMisconfig) {
      return errorResponse(keyMisconfig, "SUPABASE_KEY_MISCONFIGURED", 500, {
        hint: "Redeploy after fixing SUPABASE_SERVICE_ROLE_KEY in Vercel.",
      });
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

    let profileErr = await ensurePublicUserProfileWithUserJwt(
      session.session.access_token,
    );
    if (profileErr) {
      profileErr = await ensurePublicUserRow(supabase, session.user);
    }
    if (profileErr) {
      return errorResponse(
        `Account created but profile setup failed: ${profileErr}`,
        "PROFILE_CREATE_FAILED",
        500,
        {
          hint: "Run scripts/supabase-profile-rls-and-rpc.sql in Supabase SQL Editor, or ensure SUPABASE_SERVICE_ROLE_KEY is the service_role secret.",
        },
      );
    }

    await applySeedAccessRules(
      supabase,
      authData.user.id,
      email.toLowerCase(),
    );

    const { data: userRow, error: userFetchErr } = await supabase
      .from("users")
      .select("id, email, username, displayName, avatarUrl, role, status")
      .eq("id", authData.user.id)
      .single();

    if (userFetchErr || !userRow) {
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
    }

    return NextResponse.json(
      {
        accessToken: session.session.access_token,
        refreshToken: session.session.refresh_token,
        expiresIn: session.session.expires_in,
        user: userRow,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("Register error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
