import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAdminLoginRoute = createRouteMatcher(["/admin/login(.*)"]);
const isAppRoute = createRouteMatcher(["/app(.*)"]);

/**
 * Adero middleware — dual auth strategy:
 *
 * 1. /admin/* routes use the existing ADERO_ADMIN_SECRET cookie check.
 *    This preserves the current admin flow untouched.
 *
 * 2. /app/* routes use Clerk auth (shared identity with RAYLAK).
 *    These are the new front-app routes for requesters, operators, and companies.
 *
 * 3. Everything else (/, /apply/*, /portal/*, /auth/*) is public.
 */
export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (isAdminRoute(request) && !isAdminLoginRoute(request)) {
    const adminSecret = process.env["ADERO_ADMIN_SECRET"];
    const sessionCookie = request.cookies.get("adero_admin")?.value;

    if (!adminSecret || sessionCookie !== adminSecret) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (isAppRoute(request)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/auth/sign-in", request.url).toString(),
    });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
