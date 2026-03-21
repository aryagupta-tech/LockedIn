import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
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

    await ensurePublicUserRow(supabase, authUser);
    await applySeedAccessRules(supabase, authUser.id, emailLower);

    const { data: user } = await supabase
      .from("users")
      .select("id, email, username, displayName, avatarUrl, role, status")
      .eq("id", authUser.id)
      .single();

    if (!user) {
      return errorResponse(
        "Profile row could not be created. Check database `users` table and service role key.",
        "UNAUTHORIZED",
        401,
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
