import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse } from "@/lib/api-utils";
import { getCodeforcesVerificationPhrase } from "@/lib/verification/platform-ownership";

/**
 * Returns the exact string users must put in Codeforces "Organization" to prove
 * they control the handle they submit.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const supabase = createServiceClient();
    const { data: row } = await supabase
      .from("users")
      .select("githubUsername")
      .eq("id", auth.user.id)
      .single();

    if (!row?.githubUsername?.trim()) {
      return errorResponse(
        "Sign in with GitHub to verify with Codeforces.",
        "GITHUB_IDENTITY_REQUIRED",
        403,
      );
    }

    try {
      const phrase = getCodeforcesVerificationPhrase(
        auth.user.id,
        row.githubUsername.trim(),
      );
      return NextResponse.json({ phrase });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Configuration error";
      return errorResponse(msg, "VERIFICATION_CONFIG", 500);
    }
  } catch (e) {
    console.error("codeforces-phrase error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
