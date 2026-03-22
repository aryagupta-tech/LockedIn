import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, errorResponse } from "@/lib/api-utils";
import { isInternalStaffEmail } from "@/lib/internal-account";

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  status: string;
};

function filterVisibleUsers(rows: UserRow[], viewerInternal: boolean, viewerAdmin: boolean): UserRow[] {
  return rows.filter((u) => {
    if (u.status !== "APPROVED") return false;
    if (isInternalStaffEmail(u.email) && !viewerInternal && !viewerAdmin) return false;
    return true;
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ param: string }> },
) {
  try {
    const { param: username } = await params;
    const supabase = createServiceClient();

    const { data: target } = await supabase
      .from("users")
      .select("id, email")
      .eq("username", username)
      .single();

    if (!target) return errorResponse("Profile not found", "NOT_FOUND", 404);

    const viewer = await getAuthUser(request);
    const viewerInternal = isInternalStaffEmail(viewer?.email);
    let viewerAdmin = false;
    if (viewer) {
      const { data: vr } = await supabase.from("users").select("role").eq("id", viewer.id).single();
      viewerAdmin = vr?.role === "ADMIN";
    }
    if (isInternalStaffEmail(target.email) && !viewerInternal && !viewerAdmin) {
      return errorResponse("Profile not found", "NOT_FOUND", 404);
    }

    const { data: rows, error } = await supabase
      .from("follows")
      .select("followingId, createdAt")
      .eq("followerId", target.id)
      .order("createdAt", { ascending: false });

    if (error) throw error;

    const orderedIds: string[] = [];
    const seen = new Set<string>();
    for (const r of rows || []) {
      if (!seen.has(r.followingId)) {
        seen.add(r.followingId);
        orderedIds.push(r.followingId);
      }
    }

    if (orderedIds.length === 0) {
      return NextResponse.json({ items: [] as { id: string; username: string; displayName: string; avatarUrl: string | null }[] });
    }

    const { data: users, error: uErr } = await supabase
      .from("users")
      .select("id, username, displayName, avatarUrl, email, status")
      .in("id", orderedIds);

    if (uErr) throw uErr;

    const byId = new Map((users as UserRow[] | null)?.map((u) => [u.id, u]) ?? []);
    const visible = filterVisibleUsers([...byId.values()], viewerInternal, viewerAdmin);
    const visibleSet = new Set(visible.map((u) => u.id));

    const items = orderedIds
      .filter((id) => visibleSet.has(id))
      .map((id) => {
        const u = byId.get(id)!;
        return {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
        };
      });

    return NextResponse.json({ items });
  } catch (e) {
    console.error("List following error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
