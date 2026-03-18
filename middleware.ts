import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/register", "/auth", "/dev-login"];
const authOnlyPaths = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has("lockedin_logged_in");

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
