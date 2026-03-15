import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAdmin, errorResponse } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    let query = supabase
      .from("appeals")
      .select("*", { count: "exact" })
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: items, count: total } = await query;

    const userIds = [...new Set((items || []).map((a) => a.userId))];
    const appIds = [...new Set((items || []).map((a) => a.applicationId))];

    const [usersRes, appsRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from("users").select("id, email, username").in("id", userIds)
        : Promise.resolve({ data: [] }),
      appIds.length > 0
        ? supabase.from("applications").select("id, score, status").in("id", appIds)
        : Promise.resolve({ data: [] }),
    ]);

    const userMap = new Map((usersRes.data || []).map((u) => [u.id, u]));
    const appMap = new Map((appsRes.data || []).map((a) => [a.id, a]));

    const enriched = (items || []).map((a) => ({
      ...a,
      user: userMap.get(a.userId) || null,
      application: appMap.get(a.applicationId) || null,
    }));

    return NextResponse.json({
      items: enriched,
      total: total || 0,
      page,
      limit,
      pages: Math.ceil((total || 0) / limit),
    });
  } catch (e) {
    console.error("Admin list appeals error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
