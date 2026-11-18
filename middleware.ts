import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get("chathub_demo_session")?.value === "authenticated";
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    if (isLoggedIn) return NextResponse.redirect(new URL("/knowledge", request.url));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/knowledge/:path*", "/workflows/:path*"],
};
