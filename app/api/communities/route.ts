import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireApproved, errorResponse, generateId, now } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    const { data: communities } = await supabase
      .from("communities").select("*")
      .order("memberCount", { ascending: false }).range(offset, offset + limit - 1);

    if (!communities || communities.length === 0) return NextResponse.json([]);

    const ownerIds = [...new Set(communities.map((c) => c.ownerId))];
    const { data: owners } = await supabase
      .from("users").select("id, username, displayName").in("id", ownerIds);

    const ownerMap = new Map((owners || []).map((o) => [o.id, o]));
    const result = communities.map((c) => ({ ...c, owner: ownerMap.get(c.ownerId) || null }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("List communities error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApproved(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { name, slug, description, isPrivate, gatingCriteria } = body;

    if (!name || !slug) return errorResponse("Name and slug are required", "VALIDATION_ERROR", 400);

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("communities").select("id").eq("slug", slug).maybeSingle();
    if (existing) return errorResponse("A community with this slug already exists", "CONFLICT", 409);

    const ts = now();
    const communityId = generateId();

    await supabase.from("communities").insert({
      id: communityId, name, slug, description: description || null,
      ownerId: auth.user.id, isPrivate: isPrivate ?? true,
      gatingCriteria: gatingCriteria || null, memberCount: 1,
      createdAt: ts, updatedAt: ts,
    });

    await supabase.from("community_members").insert({
      id: generateId(), communityId, userId: auth.user.id, role: "OWNER", joinedAt: ts,
    });

    const { data: owner } = await supabase
      .from("users").select("id, username, displayName").eq("id", auth.user.id).single();

    return NextResponse.json({
      id: communityId, name, slug, description: description || null,
      isPrivate: isPrivate ?? true, memberCount: 1,
      gatingCriteria: gatingCriteria || null, owner, createdAt: ts,
    }, { status: 201 });
  } catch (e) {
    console.error("Create community error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
