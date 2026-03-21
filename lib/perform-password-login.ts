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
import { applySeedAccessRules } from "@/lib/seed-access-rules";

/**
 * Shared email/password sign-in used by /api/auth/login and (dev only) /api/dev-login.
 */
export async function performPasswordLogin(
  email: string,
  password: string,
): Promise<NextResponse> {
  try {
    const emailLower = email.toLowerCase();

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

    const { data: session, error } = await anon.auth.signInWithPassword({
      email: emailLower,
      password,
    });

    if (error || !session.session) {
      return errorResponse("Invalid email or password", "UNAUTHORIZED", 401);
    }

    const authUser = session.user;
    const accessToken = session.session.access_token;

    let ensureErr = await ensurePublicUserProfileWithUserJwt(accessToken);
    if (ensureErr) {
      const svc = createServiceClientIfConfigured();
      if (svc) {
        ensureErr = await ensurePublicUserRow(svc, authUser);
      }
    }

    if (ensureErr) {
      return errorResponse(
        "Could not create your profile row in the database.",
        "PROFILE_CREATE_FAILED",
        401,
        {
          details: ensureErr,
          hint:
            ensureErr.includes("users_email_key") || ensureErr.includes("duplicate key")
              ? "Your email is tied to an old public.users row (e.g. recreated Auth user). Re-run the updated SQL in Supabase SQL Editor (scripts/supabase-profile-rls-and-rpc.sql — removes orphan rows by email), or delete the stale row in Table Editor → public.users."
              : "Run scripts/supabase-profile-rls-and-rpc.sql in Supabase (SQL Editor), or set SUPABASE_SERVICE_ROLE_KEY to the service_role secret from Supabase → Settings → API.",
        },
      );
    }

    const svc = createServiceClientIfConfigured();
    if (svc) {
      await applySeedAccessRules(svc, authUser.id, emailLower);
    }

    const userAuthed = createUserAuthedClient(accessToken);
    let { data: user, error: userSelectErr } = await userAuthed
      .from("users")
      .select("id, email, username, displayName, avatarUrl, role, status")
      .eq("id", authUser.id)
      .single();

    if (userSelectErr || !user) {
      const svcRead = createServiceClientIfConfigured();
      if (svcRead) {
        const r2 = await svcRead
          .from("users")
          .select("id, email, username, displayName, avatarUrl, role, status")
          .eq("id", authUser.id)
          .single();
        user = r2.data ?? null;
        userSelectErr = r2.error ?? null;
      }
    }

    if (userSelectErr || !user) {
      return errorResponse(
        "Profile was not found after sign-in. Run scripts/supabase-profile-rls-and-rpc.sql (adds SELECT policy) or fix service_role access.",
        "UNAUTHORIZED",
        401,
        {
          details: userSelectErr?.message,
        },
      );
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
    console.error("performPasswordLogin error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
