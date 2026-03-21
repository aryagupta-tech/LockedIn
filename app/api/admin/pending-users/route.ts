import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAdmin, errorResponse } from "@/lib/api-utils";

/**
 * Accounts still waiting for platform access (users.status = PENDING).
 * Includes latest application row if any — many signups never open /apply.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));

    const supabase = createServiceClient();

    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("id, email, username, displayName, createdAt, status")
      .eq("status", "PENDING")
      .order("createdAt", { ascending: false })
      .limit(limit);

    if (usersErr) {
      console.error("pending-users users query:", usersErr);
      return errorResponse("Could not load users", "DB_ERROR", 500);
    }

    const list = users || [];
    if (list.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const userIds = list.map((u) => u.id);
    const { data: apps } = await supabase
      .from("applications")
      .select("id, userId, status, createdAt")
      .in("userId", userIds)
      .order("createdAt", { ascending: false });

    const latestByUser = new Map<string, { id: string; status: string; createdAt: string }>();
    for (const a of apps || []) {
      if (!latestByUser.has(a.userId)) {
        latestByUser.set(a.userId, {
          id: a.id,
          status: a.status,
          createdAt: a.createdAt as string,
        });
      }
    }

    const items = list.map((u) => ({
      ...u,
      latestApplication: latestByUser.get(u.id) ?? null,
    }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error("Admin pending-users error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
