import { TRPCError } from "@trpc/server";
import { eq, desc, count, ilike, or, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@raylak/db";
import { users, bookings } from "@raylak/db";
import { createTRPCRouter, dispatcherProcedure } from "../trpc";

export const customerRouter = createTRPCRouter({
  list: dispatcherProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const { search, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions = [eq(users.role, "customer")];
      if (search) {
        const s = `%${search}%`;
        conditions.push(or(ilike(users.firstName, s), ilike(users.lastName, s), ilike(users.email, s), ilike(users.phone, s))!);
      }

      const where = and(...conditions);

      const [rows, totalRows] = await Promise.all([
        db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: users.phone,
            isActive: users.isActive,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(where)
          .orderBy(desc(users.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(users).where(where),
      ]);

      return { items: rows, total: totalRows[0]?.value ?? 0, page, limit };
    }),

  getById: dispatcherProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [customer] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, input.id), eq(users.role, "customer")))
        .limit(1);

      if (!customer) throw new TRPCError({ code: "NOT_FOUND" });

      // Last 10 bookings for this customer
      const bookingHistory = await db
        .select({
          id: bookings.id,
          referenceCode: bookings.referenceCode,
          status: bookings.status,
          serviceType: bookings.serviceType,
          scheduledAt: bookings.scheduledAt,
          pickupAddress: bookings.pickupAddress,
          dropoffAddress: bookings.dropoffAddress,
          quotedAmount: bookings.quotedAmount,
          acquisitionSource: bookings.acquisitionSource,
          createdAt: bookings.createdAt,
        })
        .from(bookings)
        .where(eq(bookings.customerId, input.id))
        .orderBy(desc(bookings.createdAt))
        .limit(10);

      const [totalBookings] = await db
        .select({ value: count() })
        .from(bookings)
        .where(eq(bookings.customerId, input.id));

      return {
        ...customer,
        bookingHistory,
        totalBookings: totalBookings?.value ?? 0,
      };
    }),
});
