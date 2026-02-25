import { NextResponse } from "next/server";
import { z } from "zod";
import { addEntry, getCount } from "@/lib/waitlist";

const applySchema = z.object({
  name: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["Developer", "Designer", "Creator", "Founder", "Other"]),
  github: z.string().optional(),
  interest: z.enum([
    "salary-sharing",
    "project-collab",
    "weekly-digest",
    "job-board",
    "private-communities",
  ], { required_error: "Pick what excites you most" }),
  feedback: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = applySchema.parse(body);

    const entry = await addEntry(data);
    const count = await getCount();

    return NextResponse.json(
      {
        message: "Application received.",
        position: count,
        id: entry.id,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed.", details: err.flatten().fieldErrors },
        { status: 400 }
      );
    }

    if (err instanceof Error && err.message.includes("already applied")) {
      return NextResponse.json(
        { error: "This email has already applied." },
        { status: 409 }
      );
    }

    console.error("POST /api/apply error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const count = await getCount();
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
