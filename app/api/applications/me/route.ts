import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const supabase = createServiceClient();
    const { data } = await supabase
      .from("applications").select("*").eq("userId", auth.user.id)
      .order("createdAt", { ascending: false });

    return NextResponse.json(data || []);
  } catch (e) {
    console.error("Get applications error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
