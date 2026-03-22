import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse } from "@/lib/api-utils";

/**
 * List notifications for the signed-in user (no direct PostgREST from the browser).
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return Response.json({ notifications: data ?? [] });
  } catch (e) {
    console.error("GET /api/notifications/me:", e);
    return errorResponse("Failed to load notifications", "INTERNAL_ERROR", 500);
  }
}
