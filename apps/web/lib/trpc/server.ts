import "server-only";
import { createCallerFactory, createTRPCContext } from "./trpc";
import { appRouter } from "./root";
import { cache } from "react";

/**
 * Server-side tRPC caller.
 * Use in Server Components to call procedures without HTTP round-trips.
 *
 * Usage:
 *   const trpc = await createCaller();
 *   const data = await trpc.bookings.list({ page: 1 });
 */
const createCaller = createCallerFactory(appRouter);

export const createServerCaller = cache(async () => {
  const ctx = await createTRPCContext();
  return createCaller(ctx);
});
