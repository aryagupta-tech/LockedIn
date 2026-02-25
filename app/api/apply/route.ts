import { NextResponse } from "next/server";
import { z } from "zod";

const applySchema = z.object({
  name: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["Developer", "Designer", "Creator", "Founder", "Other"]),
  github: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = applySchema.parse(body);

    // TODO: persist to a database when ready
    console.log("New application:", data);

    return NextResponse.json(
      { message: "Application received.", data },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed.", details: err.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error("POST /api/apply error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
