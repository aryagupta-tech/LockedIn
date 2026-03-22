import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse } from "@/lib/api-utils";

/** Mark all notifications read for the current user. */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", auth.user.id)
      .eq("read", false);

    if (error) throw error;

    return Response.json({ ok: true });
  } catch (e) {
    console.error("POST /api/notifications/read-all:", e);
    return errorResponse("Failed to update notifications", "INTERNAL_ERROR", 500);
  }
}
