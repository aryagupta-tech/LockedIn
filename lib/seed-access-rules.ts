import type { SupabaseClient } from "@supabase/supabase-js";
import { now } from "@/lib/api-utils";

function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Optional: auto-approve or grant admin to specific emails after login/register.
 * Requires a working service-role client (updates `public.users`).
 */
export async function applySeedAccessRules(
  supabase: SupabaseClient,
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
