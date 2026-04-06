import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Route protection matrix:
 *
 * Public routes  — accessible without sign-in
 * Dashboard      — requires auth; role checked at page level via requireRole()
 * Driver routes  — requires auth; role "driver" enforced at page level
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/about",
  "/services(.*)",
  "/contact",
  "/airports(.*)",
  "/book(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/trpc/(.*)", // tRPC public procedures handle their own auth
  "/api/webhooks/(.*)", // Clerk + Stripe webhooks
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
