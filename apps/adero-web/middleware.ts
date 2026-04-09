import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { addSecurityHeaders } from "./middleware-headers";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAdminLoginRoute = createRouteMatcher(["/admin/login(.*)"]);
const isAppRoute = createRouteMatcher(["/app(.*)"]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (isAdminRoute(request) && !isAdminLoginRoute(request)) {
    const adminSecret = process.env["ADERO_ADMIN_SECRET"];
    const sessionCookie = request.cookies.get("adero_admin")?.value;

    if (!adminSecret || sessionCookie !== adminSecret) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    return addSecurityHeaders(NextResponse.next());
  }

  if (isAppRoute(request)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/auth/sign-in", request.url).toString(),
    });
    return addSecurityHeaders(NextResponse.next());
  }

  return addSecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
