import { NextResponse } from "next/server";
import { getEntries } from "@/lib/waitlist";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || key !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await getEntries();

  return NextResponse.json({
    total: entries.length,
    entries: entries.sort(
      (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
    ),
  });
}
