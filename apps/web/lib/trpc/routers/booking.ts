import { TRPCError } from "@trpc/server";
import { eq, and, or, ilike, desc, count, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@raylak/db";
import { bookings, bookingStatusLog, users } from "@raylak/db";
import {
  BookingIntakeSchema,
  BookingFilterSchema,
  QuoteBookingSchema,
  ConfirmBookingSchema,
} from "@raylak/shared/validators";
import { BOOKING_STATUS_TRANSITIONS } from "@raylak/shared/enums";
import { createTRPCRouter, publicProcedure, dispatcherProcedure } from "../trpc";
import { sendBookingConfirmation } from "../../email";

function generateReferenceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return `RAY-${code}`;
}

export const bookingRouter = createTRPCRouter({
  // ─── Public intake ─────────────────────────────────────────────────────────

  createIntake: publicProcedure.input(BookingIntakeSchema).mutation(async ({ input, ctx }) => {
    const email = input.email.toLowerCase().trim();

    let customer = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, clerkId: true },
    });

    if (!customer) {
      const [created] = await db
        .insert(users)
        .values({
          clerkId: ctx.userId ?? null,
          email,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone.trim(),
          role: "customer",
        })
        .returning({ id: users.id, clerkId: users.clerkId });
      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      customer = created;
    } else if (ctx.userId && !customer.clerkId) {
      await db
        .update(users)
        .set({ clerkId: ctx.userId, updatedAt: new Date() })
        .where(eq(users.id, customer.id));
    }

    let referenceCode = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateReferenceCode();
      const existing = await db.query.bookings.findFirst({
        where: eq(bookings.referenceCode, candidate),
        columns: { id: true },
      });
      if (!existing) { referenceCode = candidate; break; }
    }
    if (!referenceCode) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not generate reference code" });

    const [booking] = await db
      .insert(bookings)
      .values({
        referenceCode,
        status: "new_request",
        serviceType: input.serviceType,
        customerId: customer.id,
        scheduledAt: input.scheduledAt,
        pickupAddress: input.pickupAddress,
        dropoffAddress: input.dropoffAddress,
        passengerCount: input.passengerCount,
        flightNumber: input.flightNumber ?? null,
        specialInstructions: input.specialInstructions ?? null,
        acquisitionSource: input.acquisitionSource ?? null,
      })
      .returning();

    if (!booking) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    await db.insert(bookingStatusLog).values({
      bookingId: booking.id,
      fromStatus: null,
      toStatus: "new_request",
      actorId: customer.id,
      note: "Booking submitted via website",
      snapshot: { referenceCode, serviceType: booking.serviceType },
    });

    sendBookingConfirmation({
      to: email,
      firstName: input.firstName.trim(),
      referenceCode,
      serviceType: input.serviceType,
      scheduledAt: input.scheduledAt,
      pickupAddress: input.pickupAddress,
      dropoffAddress: input.dropoffAddress,
    }).catch((err: unknown) => { console.error("[email] Confirmation failed:", err); });

    return { referenceCode, bookingId: booking.id };
  }),

  // ─── Public confirmation lookup ────────────────────────────────────────────

  getByCode: publicProcedure
    .input(z.object({ code: z.string().min(1).max(20) }))
    .query(async ({ input }) => {
      const [booking] = await db
        .select({
          referenceCode: bookings.referenceCode,
          status: bookings.status,
          serviceType: bookings.serviceType,
          scheduledAt: bookings.scheduledAt,
          pickupAddress: bookings.pickupAddress,
          dropoffAddress: bookings.dropoffAddress,
          passengerCount: bookings.passengerCount,
          flightNumber: bookings.flightNumber,
          createdAt: bookings.createdAt,
        })
        .from(bookings)
        .where(eq(bookings.referenceCode, input.code))
        .limit(1);

      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      return booking;
    }),

  // ─── Operator: booking list ─────────────────────────────────────────────────

  list: dispatcherProcedure.input(BookingFilterSchema).query(async ({ input }) => {
    const { status, serviceType, from, to, search, page, limit } = input;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status) conditions.push(eq(bookings.status, status));
    if (serviceType) conditions.push(eq(bookings.serviceType, serviceType));
    if (from) conditions.push(gte(bookings.scheduledAt, from));
    if (to) conditions.push(lte(bookings.scheduledAt, to));
    if (search) {
      const s = `%${search}%`;
      conditions.push(
        or(
          ilike(bookings.referenceCode, s),
          ilike(users.email, s),
          ilike(users.firstName, s),
          ilike(users.lastName, s),
          ilike(users.phone, s),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: bookings.id,
          referenceCode: bookings.referenceCode,
          status: bookings.status,
          serviceType: bookings.serviceType,
          scheduledAt: bookings.scheduledAt,
          pickupAddress: bookings.pickupAddress,
          dropoffAddress: bookings.dropoffAddress,
          passengerCount: bookings.passengerCount,
          quotedAmount: bookings.quotedAmount,
          flightNumber: bookings.flightNumber,
          acquisitionSource: bookings.acquisitionSource,
          createdAt: bookings.createdAt,
          customerFirstName: users.firstName,
          customerLastName: users.lastName,
          customerEmail: users.email,
          customerPhone: users.phone,
        })
        .from(bookings)
        .leftJoin(users, eq(bookings.customerId, users.id))
        .where(where)
        .orderBy(desc(bookings.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ value: count() })
        .from(bookings)
        .leftJoin(users, eq(bookings.customerId, users.id))
        .where(where),
    ]);

    return {
      items: rows,
      total: totalRows[0]?.value ?? 0,
      page,
      limit,
    };
  }),

  // ─── Operator: booking detail ───────────────────────────────────────────────

  getById: dispatcherProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select({
          id: bookings.id,
          referenceCode: bookings.referenceCode,
          status: bookings.status,
          serviceType: bookings.serviceType,
          scheduledAt: bookings.scheduledAt,
          pickupAddress: bookings.pickupAddress,
          dropoffAddress: bookings.dropoffAddress,
          passengerCount: bookings.passengerCount,
          quotedAmount: bookings.quotedAmount,
          totalAmount: bookings.totalAmount,
          flightNumber: bookings.flightNumber,
          specialInstructions: bookings.specialInstructions,
          acquisitionSource: bookings.acquisitionSource,
          isPrivate: bookings.isPrivate,
          createdAt: bookings.createdAt,
          updatedAt: bookings.updatedAt,
          customerId: bookings.customerId,
          customerFirstName: users.firstName,
          customerLastName: users.lastName,
          customerEmail: users.email,
          customerPhone: users.phone,
        })
        .from(bookings)
        .leftJoin(users, eq(bookings.customerId, users.id))
        .where(eq(bookings.id, input.id))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      // Status log for this booking (most recent first, max 20)
      const log = await db.query.bookingStatusLog.findMany({
        where: eq(bookingStatusLog.bookingId, input.id),
        orderBy: [desc(bookingStatusLog.createdAt)],
        limit: 20,
      });

      return { ...row, statusLog: log };
    }),

  // ─── Operator: add quote ────────────────────────────────────────────────────

  addQuote: dispatcherProcedure.input(QuoteBookingSchema).mutation(async ({ input, ctx }) => {
    const [booking] = await db
      .select({ id: bookings.id, status: bookings.status, customerId: bookings.customerId })
      .from(bookings)
      .where(eq(bookings.id, input.bookingId))
      .limit(1);

    if (!booking) throw new TRPCError({ code: "NOT_FOUND" });

    if (booking.status !== "new_request") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot quote a booking in status "${booking.status}". Must be new_request.`,
      });
    }

    const validNext = BOOKING_STATUS_TRANSITIONS["new_request"];
    if (!validNext.includes("quoted")) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unexpected transition map state" });
    }

    await db
      .update(bookings)
      .set({ status: "quoted", quotedAmount: String(input.quotedAmount), updatedAt: new Date() })
      .where(eq(bookings.id, input.bookingId));

    // Resolve the dispatcher's DB user id by clerkId
    let actorId: string | null = null;
    if (ctx.userId) {
      const actor = await db.query.users.findFirst({
        where: eq(users.clerkId, ctx.userId),
        columns: { id: true },
      });
      actorId = actor?.id ?? null;
    }

    await db.insert(bookingStatusLog).values({
      bookingId: input.bookingId,
      fromStatus: "new_request",
      toStatus: "quoted",
      actorId,
      note: input.note ?? null,
      snapshot: { quotedAmount: input.quotedAmount },
    });

    return { success: true };
  }),

  // ─── Operator: confirm booking ──────────────────────────────────────────────

  confirm: dispatcherProcedure.input(ConfirmBookingSchema).mutation(async ({ input, ctx }) => {
    const [booking] = await db
      .select({ id: bookings.id, status: bookings.status })
      .from(bookings)
      .where(eq(bookings.id, input.bookingId))
      .limit(1);

    if (!booking) throw new TRPCError({ code: "NOT_FOUND" });

    if (booking.status !== "quoted") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot confirm a booking in status "${booking.status}". Must be quoted.`,
      });
    }

    const validNext = BOOKING_STATUS_TRANSITIONS["quoted"];
    if (!validNext.includes("confirmed")) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unexpected transition map state" });
    }

    await db
      .update(bookings)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(bookings.id, input.bookingId));

    let actorId: string | null = null;
    if (ctx.userId) {
      const actor = await db.query.users.findFirst({
        where: eq(users.clerkId, ctx.userId),
        columns: { id: true },
      });
      actorId = actor?.id ?? null;
    }

    await db.insert(bookingStatusLog).values({
      bookingId: input.bookingId,
      fromStatus: "quoted",
      toStatus: "confirmed",
      actorId,
      note: "Booking confirmed by operator",
      snapshot: {},
    });

    return { success: true };
  }),
});
