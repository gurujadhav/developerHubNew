import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./lib/auth";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow webhook endpoint (authenticated by secret header, not JWT)
  if (pathname.startsWith("/api/webhook")) {
    return NextResponse.next();
  }

  // Check auth for dashboard routes and protected API routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/projects") || pathname.startsWith("/api/")) {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const payload = verifyToken(token);
    if (!payload) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("auth_token");
      return response;
    }

    // Inject user info into headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.userId);
    requestHeaders.set("x-user-email", payload.email);
    requestHeaders.set("x-user-name", payload.name);

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Root redirect
  if (pathname === "/") {
    const token = request.cookies.get("auth_token")?.value;
    if (token && verifyToken(token)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts).*)"],
};
