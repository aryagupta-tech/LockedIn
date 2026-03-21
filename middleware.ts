import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authOnlyPaths = ["/login", "/register"];

function publicPathsForEnv(): string[] {
  const base = ["/", "/login", "/register", "/auth"];
  if (process.env.NODE_ENV === "development") {
    return [...base, "/dev-login"];
  }
  return base;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPaths = publicPathsForEnv();
  const hasToken = request.cookies.has("lockedin_logged_in");

  if (process.env.NODE_ENV === "production" && pathname.startsWith("/dev-login")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasToken && authOnlyPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  if (!hasToken && !publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)"],
};
