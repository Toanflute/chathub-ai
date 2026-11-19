import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = [
  "/inbox",
  "/knowledge",
  "/workflows",
  "/contacts",
  "/products",
  "/orders",
  "/appointments",
  "/quick-replies",
  "/campaigns",
  "/channels",
  "/team",
  "/reports",
  "/activity",
  "/settings",
];

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get("chathub-auth")?.value === "true";
  const { pathname } = request.nextUrl;
  const needsAuth =
    pathname === "/" ||
    protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (needsAuth && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/" && isAuthenticated) {
    const inboxUrl = request.nextUrl.clone();
    inboxUrl.pathname = "/inbox";
    inboxUrl.search = "";
    return NextResponse.redirect(inboxUrl);
  }

  if (pathname === "/login" && isAuthenticated) {
    const inboxUrl = request.nextUrl.clone();
    inboxUrl.pathname = "/inbox";
    inboxUrl.search = "";
    return NextResponse.redirect(inboxUrl);
  }

  return NextResponse.next();
}
