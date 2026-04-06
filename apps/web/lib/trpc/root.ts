import { createTRPCRouter } from "./trpc";

/**
 * Root tRPC router.
 * Feature routers are added here as they are built in subsequent phases.
 *
 * Example (Phase 2+):
 *   import { bookingsRouter } from "../routers/bookings";
 *   export const appRouter = createTRPCRouter({
 *     bookings: bookingsRouter,
 *   });
 */
export const appRouter = createTRPCRouter({
  // Feature routers added in Phase 2+
});

export type AppRouter = typeof appRouter;
