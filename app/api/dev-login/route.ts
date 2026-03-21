import { NextResponse } from "next/server";
import { performPasswordLogin } from "@/lib/perform-password-login";

/**
 * Local development only: signs in using server-side env vars (never NEXT_PUBLIC_*).
 * Disabled in production builds so credentials are not exposed on GitHub/Vercel.
 */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = process.env.DEV_LOGIN_EMAIL?.trim();
  const password = process.env.DEV_LOGIN_PASSWORD;

  if (!email || !password) {
    return NextResponse.json(
      {
        error:
          "Dev auto-login not configured. Set DEV_LOGIN_EMAIL and DEV_LOGIN_PASSWORD in .env (local only — do not commit).",
      },
      { status: 503 },
    );
  }

  return performPasswordLogin(email, password);
}
