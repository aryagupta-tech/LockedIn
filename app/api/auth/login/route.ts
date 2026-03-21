import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
import { performPasswordLogin } from "@/lib/perform-password-login";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("Missing required fields", "VALIDATION_ERROR", 400);
    }

    return performPasswordLogin(email, password);
  } catch (e) {
    console.error("Login error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
