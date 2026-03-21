import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getServiceRoleKeyMisconfigurationError } from "@/lib/supabase-service-key";
import { errorResponse, now } from "@/lib/api-utils";
import { ensurePublicUserRow } from "@/lib/ensure-public-user";

function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Optional dev/staging: auto-approve or grant admin to specific emails after login.
 * Set in Vercel env — never commit real addresses with production secrets.
 */
async function applySeedAccessRules(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  emailLower: string,
): Promise<void> {
  const adminEmails = parseEmailList(process.env.LOCKEDIN_SEED_ADMIN_EMAILS);
  const approvedEmails = parseEmailList(process.env.LOCKEDIN_SEED_APPROVED_EMAILS);

  if (adminEmails.includes(emailLower)) {
    await supabase
      .from("users")
      .update({
        status: "APPROVED",
        role: "ADMIN",
        updatedAt: now(),
      })
      .eq("id", userId);
    return;
  }

  if (approvedEmails.includes(emailLower)) {
    await supabase
      .from("users")
      .update({ status: "APPROVED", updatedAt: now() })
      .eq("id", userId);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("Missing required fields", "VALIDATION_ERROR", 400);
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ) {
      return errorResponse(
        "Server missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
        "INTERNAL_ERROR",
        500,
      );
    }

    const keyMisconfig = getServiceRoleKeyMisconfigurationError();
    if (keyMisconfig) {
      return errorResponse(keyMisconfig, "SUPABASE_KEY_MISCONFIGURED", 500, {
        hint: "Redeploy after fixing the env var. The service_role value is labeled “service_role” in Supabase API settings and is longer than the anon key.",
      });
    }

    const supabase = createServiceClient();
    const emailLower = email.toLowerCase();

    const { data: session, error } = await supabase.auth.signInWithPassword({
      email: emailLower,
      password,
    });

    if (error || !session.session) {
      return errorResponse("Invalid email or password", "UNAUTHORIZED", 401);
    }

    const authUser = session.user;

    const ensureErr = await ensurePublicUserRow(supabase, authUser);
    if (ensureErr) {
      return errorResponse(
        "Could not create your profile row in the database.",
        "PROFILE_CREATE_FAILED",
        401,
        {
          details: ensureErr,
          hint:
            "In Vercel, set SUPABASE_SERVICE_ROLE_KEY to the service_role secret from Supabase (Settings → API), not the anon key. If the error mentions a column, add missing columns or defaults — see scripts/fix-users-profile.sql in the repo.",
        },
      );
    }

    await applySeedAccessRules(supabase, authUser.id, emailLower);

    const { data: user, error: userSelectErr } = await supabase
      .from("users")
      .select("id, email, username, displayName, avatarUrl, role, status")
      .eq("id", authUser.id)
      .single();

    if (userSelectErr || !user) {
      return errorResponse(
        "Profile was not found after sign-in. Check that `public.users` exists and RLS allows the service role.",
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
