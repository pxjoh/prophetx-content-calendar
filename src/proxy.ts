import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE.name)?.value;
  const isAuthenticated = verifySessionToken(token);
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";

  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Every request except static assets and the login page itself goes through
  // the password gate — including API routes, so writes can't bypass it.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
