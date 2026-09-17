import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { isAdminEmail } from "@/lib/security";

// These API routes do their own (server-side session + security-state) checks.
const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/recover",
  "/api/auth/logout",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API.includes(pathname)) return NextResponse.next();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const authPages = ["/login", "/signup", "/recover"];
  if (authPages.includes(pathname)) {
    // Optimistic check only; the real authority is server-side sessions.
    if (payload) {
      const url = request.nextUrl.clone();
      url.pathname = "/numbers";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname === "/admin") {
    if (!payload || !isAdminEmail(payload.email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/numbers";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!payload) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/numbers/:path*",
    "/admin",
    "/recover",
    "/login",
    "/signup",
    "/",
  ],
};