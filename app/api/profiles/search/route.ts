import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse } from "@/lib/api-utils";
import { isInternalStaffEmail } from "@/lib/internal-account";

const SELECT = "id, username, displayName, avatarUrl, email";

/**
 * Search approved members by username or display name (nav search).
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const raw = (url.searchParams.get("q") || "").trim().slice(0, 64);
    const safe = raw.replace(/[%_,]/g, " ").replace(/\s+/g, " ").trim();
    if (safe.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit")) || 12));
    const pattern = `%${safe}%`;

    const supabase = createServiceClient();

    const viewerInternal = isInternalStaffEmail(auth.user.email);
    const { data: vr } = await supabase.from("users").select("role").eq("id", auth.user.id).single();
    const viewerAdmin = vr?.role === "ADMIN";

    const [{ data: byUsername, error: e1 }, { data: byName, error: e2 }] = await Promise.all([
      supabase
        .from("users")
        .select(SELECT)
        .eq("status", "APPROVED")
        .neq("id", auth.user.id)
        .ilike("username", pattern)
        .order("username", { ascending: true })
        .limit(25),
      supabase
        .from("users")
        .select(SELECT)
        .eq("status", "APPROVED")
        .neq("id", auth.user.id)
        .ilike("displayName", pattern)
        .order("username", { ascending: true })
        .limit(25),
    ]);

    if (e1 || e2) {
      console.error("Profile search error:", e1 || e2);
      return errorResponse("Could not search profiles", "INTERNAL_ERROR", 500);
    }

    const merged = new Map<string, (typeof byUsername)[0]>();
    for (const row of [...(byUsername || []), ...(byName || [])]) {
      if (row?.id) merged.set(row.id, row);
    }

    const items = Array.from(merged.values())
      .filter((u) => {
        const internal = isInternalStaffEmail((u as { email?: string | null }).email);
        if (!internal) return true;
        return viewerInternal || viewerAdmin;
      })
      .sort((a, b) => (a.username || "").localeCompare(b.username || ""))
      .slice(0, limit)
      .map(({ id, username, displayName, avatarUrl }) => ({
        id,
        username,
        displayName,
        avatarUrl,
      }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error("Profile search error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
