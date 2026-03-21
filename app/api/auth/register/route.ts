import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getServiceRoleKeyMisconfigurationError } from "@/lib/supabase-service-key";
import { errorResponse } from "@/lib/api-utils";
import {
  isValidEmail,
  validateDisplayName,
  validatePassword,
  validateUsername,
} from "@/lib/validation";
import { isUsernameAvailable } from "@/lib/username-holds";
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

    if (!isValidEmail(email)) {
      return errorResponse("Enter a valid email address.", "VALIDATION_ERROR", 400);
    }

    const userCheck = validateUsername(username);
    if (!userCheck.ok) {
      return errorResponse(userCheck.error, "VALIDATION_ERROR", 400);
    }

    const pwErr = validatePassword(password);
    if (pwErr) {
      return errorResponse(pwErr, "VALIDATION_ERROR", 400);
    }

    const dnErr = validateDisplayName(displayName);
    if (dnErr) {
      return errorResponse(dnErr, "VALIDATION_ERROR", 400);
    }

    const keyMisconfig = getServiceRoleKeyMisconfigurationError();
    if (keyMisconfig) {
      return errorResponse(keyMisconfig, "SUPABASE_KEY_MISCONFIGURED", 500, {
        hint: "Redeploy after fixing SUPABASE_SERVICE_ROLE_KEY in Vercel.",
      });
    }

    const supabase = createServiceClient();

    const emailLower = email.trim().toLowerCase();
    const usernameNorm = userCheck.username;

    const { data: emailTaken } = await supabase
      .from("users")
      .select("id")
      .eq("email", emailLower)
      .maybeSingle();

    if (emailTaken) {
      return errorResponse("This email is already registered.", "CONFLICT", 409);
    }

    const usernameFree = await isUsernameAvailable(supabase, usernameNorm);
    if (!usernameFree.ok) {
      return errorResponse(usernameFree.message, "CONFLICT", 409);
    }

    const displayTrimmed = displayName.trim();

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: emailLower,
        password,
        email_confirm: true,
        user_metadata: { username: usernameNorm, displayName: displayTrimmed },
      });

    if (authError) {
      return errorResponse(authError.message, "CONFLICT", 409);
    }

    const { data: session, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: emailLower,
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

    await applySeedAccessRules(supabase, authData.user.id, emailLower);

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
            email: emailLower,
            username: usernameNorm,
            displayName: displayTrimmed,
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
