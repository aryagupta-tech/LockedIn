import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAdmin, errorResponse } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const supabase = createServiceClient();
    const { data } = await supabase
      .from("scoring_weights")
      .select("*")
      .order("key", { ascending: true });

    return NextResponse.json(data || []);
  } catch (e) {
    console.error("Get weights error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
