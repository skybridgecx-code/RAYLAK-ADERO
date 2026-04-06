import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login page is always accessible
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const adminSecret = process.env["ADERO_ADMIN_SECRET"];
  const sessionCookie = request.cookies.get("adero_admin")?.value;

  if (!adminSecret || sessionCookie !== adminSecret) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
