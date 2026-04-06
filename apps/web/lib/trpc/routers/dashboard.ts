import { count, eq, and, gt, inArray } from "drizzle-orm";
import { db } from "@raylak/db";
import { bookings } from "@raylak/db";
import { createTRPCRouter, dispatcherProcedure } from "../trpc";

export const dashboardRouter = createTRPCRouter({
  /**
   * Summary counts for the operator dashboard landing screen.
   * Each status count is a separate lightweight query.
   */
  getStats: dispatcherProcedure.query(async () => {
    const [newRequests, quoted, confirmed, upcoming] = await Promise.all([
      db.select({ value: count() }).from(bookings).where(eq(bookings.status, "new_request")),
      db.select({ value: count() }).from(bookings).where(eq(bookings.status, "quoted")),
      db.select({ value: count() }).from(bookings).where(eq(bookings.status, "confirmed")),
      db
        .select({ value: count() })
        .from(bookings)
        .where(
          and(
            eq(bookings.serviceType, "airport_transfer"),
            inArray(bookings.status, ["confirmed", "assigned"]),
            gt(bookings.scheduledAt, new Date()),
          ),
        ),
    ]);

    return {
      newRequests: newRequests[0]?.value ?? 0,
      quoted: quoted[0]?.value ?? 0,
      confirmed: confirmed[0]?.value ?? 0,
      upcomingAirport: upcoming[0]?.value ?? 0,
    };
  }),
});
