import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse } from "@/lib/api-utils";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Update a single notification (e.g. mark read). Scoped to the signed-in user.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    if (!id || !UUID_RE.test(id)) {
      return errorResponse("Invalid notification id", "BAD_REQUEST", 400);
    }

    let body: { read?: boolean };
    try {
      body = (await request.json()) as { read?: boolean };
    } catch {
      return errorResponse("Invalid JSON body", "BAD_REQUEST", 400);
    }
    if (body.read !== true) {
      return errorResponse("Only { read: true } is supported", "BAD_REQUEST", 400);
    }

    const supabase = createServiceClient();

    const { data: row, error: selErr } = await supabase
      .from("notifications")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (selErr) throw selErr;
    if (!row || row.user_id !== auth.user.id) {
      return errorResponse("Not found", "NOT_FOUND", 404);
    }

    const { error: updErr } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (updErr) throw updErr;

    return Response.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/notifications/[id]:", e);
    return errorResponse("Failed to update notification", "INTERNAL_ERROR", 500);
  }
}
