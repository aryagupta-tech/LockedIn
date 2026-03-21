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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("Missing required fields", "VALIDATION_ERROR", 400);
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
    const emailLower = email.toLowerCase();

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
            "Run scripts/supabase-profile-rls-and-rpc.sql in Supabase (SQL Editor) — that fixes RLS without needing a correct service_role key. Or set SUPABASE_SERVICE_ROLE_KEY to the real service_role secret from Supabase → Settings → API.",
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
    console.error("Login error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
