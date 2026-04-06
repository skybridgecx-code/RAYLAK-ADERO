import { TRPCError } from "@trpc/server";
import { eq, and, or, ilike, desc, count, gte, lte, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@raylak/db";
import { bookings, bookingStatusLog, users, driverProfiles, vehicles } from "@raylak/db";
import {
  BookingIntakeSchema,
  BookingFilterSchema,
  QuoteBookingSchema,
  ConfirmBookingSchema,
  AssignBookingSchema,
  CancelBookingSchema,
} from "@raylak/shared/validators";
import { BOOKING_STATUS_TRANSITIONS } from "@raylak/shared/enums";
import { createTRPCRouter, publicProcedure, dispatcherProcedure } from "../trpc";
import { sendBookingConfirmation } from "../../email";
import {
  emitBookingStatusChanged,
  emitBookingAssigned,
} from "../../events";

function generateReferenceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return `RAY-${code}`;
}

// Statuses that mean a booking occupies the driver/vehicle's time
const OCCUPYING_STATUSES = [
  "confirmed",
  "assigned",
  "driver_en_route",
  "driver_arrived",
  "passenger_picked_up",
] as const;

// Buffer in milliseconds around scheduledAt for conflict detection
// hourly_charter uses 4h; all others use 2h
const CONFLICT_BUFFER_MS = {
  default: 2 * 60 * 60 * 1000,
  hourly_charter: 4 * 60 * 60 * 1000,
} as const;

function conflictWindow(scheduledAt: Date, serviceType: string): { windowStart: Date; windowEnd: Date } {
  const buffer =
    serviceType === "hourly_charter"
      ? CONFLICT_BUFFER_MS.hourly_charter
      : CONFLICT_BUFFER_MS.default;
  return {
    windowStart: new Date(scheduledAt.getTime() - buffer),
    windowEnd: new Date(scheduledAt.getTime() + buffer),
  };
}

// Resolve operator's DB user id from Clerk userId
async function resolveActorId(clerkUserId: string | null | undefined): Promise<string | null> {
  if (!clerkUserId) return null;
  const actor = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUserId),
    columns: { id: true },
  });
  return actor?.id ?? null;
}

// Aliases for multi-join on users table
const customerUsers = alias(users, "customer_users");
const driverUsers = alias(users, "driver_users");

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
          ilike(customerUsers.email, s),
          ilike(customerUsers.firstName, s),
          ilike(customerUsers.lastName, s),
          ilike(customerUsers.phone, s),
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
          assignedDriverId: bookings.assignedDriverId,
          assignedVehicleId: bookings.assignedVehicleId,
          createdAt: bookings.createdAt,
          customerFirstName: customerUsers.firstName,
          customerLastName: customerUsers.lastName,
          customerEmail: customerUsers.email,
          customerPhone: customerUsers.phone,
        })
        .from(bookings)
        .leftJoin(customerUsers, eq(bookings.customerId, customerUsers.id))
        .where(where)
        .orderBy(desc(bookings.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ value: count() })
        .from(bookings)
        .leftJoin(customerUsers, eq(bookings.customerId, customerUsers.id))
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
          canceledAt: bookings.canceledAt,
          cancelReason: bookings.cancelReason,
          createdAt: bookings.createdAt,
          updatedAt: bookings.updatedAt,
          customerId: bookings.customerId,
          customerFirstName: customerUsers.firstName,
          customerLastName: customerUsers.lastName,
          customerEmail: customerUsers.email,
          customerPhone: customerUsers.phone,
          // Assigned driver
          assignedDriverId: bookings.assignedDriverId,
          assignedDriverFirstName: driverUsers.firstName,
          assignedDriverLastName: driverUsers.lastName,
          assignedDriverEmail: driverUsers.email,
          assignedDriverPhone: driverUsers.phone,
          // Assigned vehicle
          assignedVehicleId: bookings.assignedVehicleId,
          assignedVehicleMake: vehicles.make,
          assignedVehicleModel: vehicles.model,
          assignedVehicleYear: vehicles.year,
          assignedVehicleLicensePlate: vehicles.licensePlate,
          assignedVehicleColor: vehicles.color,
        })
        .from(bookings)
        .leftJoin(customerUsers, eq(bookings.customerId, customerUsers.id))
        .leftJoin(driverProfiles, eq(bookings.assignedDriverId, driverProfiles.id))
        .leftJoin(driverUsers, eq(driverProfiles.userId, driverUsers.id))
        .leftJoin(vehicles, eq(bookings.assignedVehicleId, vehicles.id))
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

  // ─── Operator: available drivers for assignment ─────────────────────────────

  getAvailableDrivers: dispatcherProcedure
    .input(z.object({ bookingId: z.string().uuid() }))
    .query(async ({ input }) => {
      const [booking] = await db
        .select({ scheduledAt: bookings.scheduledAt, serviceType: bookings.serviceType })
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .limit(1);

      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });

      const { windowStart, windowEnd } = conflictWindow(booking.scheduledAt, booking.serviceType);

      // Drivers with occupying bookings (other than this one) in the conflict window
      const conflictedRows = await db
        .select({ driverId: bookings.assignedDriverId })
        .from(bookings)
        .where(
          and(
            inArray(bookings.status, [...OCCUPYING_STATUSES]),
            gte(bookings.scheduledAt, windowStart),
            lte(bookings.scheduledAt, windowEnd),
          ),
        );

      const conflictedDriverIds = new Set(
        conflictedRows
          .map((r) => r.driverId)
          .filter((id): id is string => id !== null),
      );

      // driverUsers alias is joined for display fields; we use eq on the same alias for isActive
      const drivers = await db
        .select({
          id: driverProfiles.id,
          firstName: driverUsers.firstName,
          lastName: driverUsers.lastName,
          email: driverUsers.email,
          phone: driverUsers.phone,
          isActive: driverUsers.isActive,
          isVerified: driverProfiles.isVerified,
          isOnline: driverProfiles.isOnline,
          defaultVehicleId: driverProfiles.defaultVehicleId,
        })
        .from(driverProfiles)
        .innerJoin(driverUsers, eq(driverProfiles.userId, driverUsers.id))
        .where(eq(driverUsers.isActive, true))
        .orderBy(driverUsers.firstName);

      return drivers.map((d) => ({
        ...d,
        hasConflict: conflictedDriverIds.has(d.id),
      }));
    }),

  // ─── Operator: available vehicles for assignment ────────────────────────────

  getAvailableVehicles: dispatcherProcedure
    .input(z.object({ bookingId: z.string().uuid() }))
    .query(async ({ input }) => {
      const [booking] = await db
        .select({ scheduledAt: bookings.scheduledAt, serviceType: bookings.serviceType })
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .limit(1);

      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });

      const { windowStart, windowEnd } = conflictWindow(booking.scheduledAt, booking.serviceType);

      const conflictedRows = await db
        .select({ vehicleId: bookings.assignedVehicleId })
        .from(bookings)
        .where(
          and(
            inArray(bookings.status, [...OCCUPYING_STATUSES]),
            gte(bookings.scheduledAt, windowStart),
            lte(bookings.scheduledAt, windowEnd),
          ),
        );

      const conflictedVehicleIds = new Set(
        conflictedRows
          .map((r) => r.vehicleId)
          .filter((id): id is string => id !== null),
      );

      const allVehicles = await db
        .select({
          id: vehicles.id,
          make: vehicles.make,
          model: vehicles.model,
          year: vehicles.year,
          type: vehicles.type,
          licensePlate: vehicles.licensePlate,
          color: vehicles.color,
          capacity: vehicles.capacity,
          luggageCapacity: vehicles.luggageCapacity,
          amenities: vehicles.amenities,
        })
        .from(vehicles)
        .where(eq(vehicles.isActive, true))
        .orderBy(vehicles.make);

      return allVehicles.map((v) => ({
        ...v,
        hasConflict: conflictedVehicleIds.has(v.id),
      }));
    }),

  // ─── Operator: add quote ────────────────────────────────────────────────────

  addQuote: dispatcherProcedure.input(QuoteBookingSchema).mutation(async ({ input, ctx }) => {
    const [booking] = await db
      .select({ id: bookings.id, status: bookings.status, customerId: bookings.customerId, referenceCode: bookings.referenceCode })
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

    const actorId = await resolveActorId(ctx.userId);

    await db.insert(bookingStatusLog).values({
      bookingId: input.bookingId,
      fromStatus: "new_request",
      toStatus: "quoted",
      actorId,
      note: input.note ?? null,
      snapshot: { quotedAmount: input.quotedAmount },
    });

    emitBookingStatusChanged({
      bookingId: input.bookingId,
      referenceCode: booking.referenceCode,
      fromStatus: "new_request",
      toStatus: "quoted",
      actorId,
    });

    return { success: true };
  }),

  // ─── Operator: confirm booking ──────────────────────────────────────────────

  confirm: dispatcherProcedure.input(ConfirmBookingSchema).mutation(async ({ input, ctx }) => {
    const [booking] = await db
      .select({ id: bookings.id, status: bookings.status, referenceCode: bookings.referenceCode })
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

    const actorId = await resolveActorId(ctx.userId);

    await db.insert(bookingStatusLog).values({
      bookingId: input.bookingId,
      fromStatus: "quoted",
      toStatus: "confirmed",
      actorId,
      note: "Booking confirmed by operator",
      snapshot: {},
    });

    emitBookingStatusChanged({
      bookingId: input.bookingId,
      referenceCode: booking.referenceCode,
      fromStatus: "quoted",
      toStatus: "confirmed",
      actorId,
    });

    return { success: true };
  }),

  // ─── Operator: assign driver + vehicle ──────────────────────────────────────

  assign: dispatcherProcedure.input(AssignBookingSchema).mutation(async ({ input, ctx }) => {
    const [booking] = await db
      .select({ id: bookings.id, status: bookings.status, serviceType: bookings.serviceType, scheduledAt: bookings.scheduledAt, referenceCode: bookings.referenceCode })
      .from(bookings)
      .where(eq(bookings.id, input.bookingId))
      .limit(1);

    if (!booking) throw new TRPCError({ code: "NOT_FOUND" });

    if (booking.status !== "confirmed") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot assign a booking in status "${booking.status}". Must be confirmed.`,
      });
    }

    const validNext = BOOKING_STATUS_TRANSITIONS["confirmed"];
    if (!validNext.includes("assigned")) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unexpected transition map state" });
    }

    // Verify driver exists and is active
    const [driverProfile] = await db
      .select({ id: driverProfiles.id, userId: driverProfiles.userId })
      .from(driverProfiles)
      .leftJoin(users, eq(driverProfiles.userId, users.id))
      .where(and(eq(driverProfiles.id, input.driverProfileId), eq(users.isActive, true)))
      .limit(1);

    if (!driverProfile) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Driver not found or inactive." });
    }

    // Verify vehicle exists and is active
    const [vehicle] = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, input.vehicleId), eq(vehicles.isActive, true)))
      .limit(1);

    if (!vehicle) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Vehicle not found or inactive." });
    }

    // Server-side conflict detection
    const { windowStart, windowEnd } = conflictWindow(booking.scheduledAt, booking.serviceType);

    const [driverConflict] = await db
      .select({ id: bookings.id, referenceCode: bookings.referenceCode })
      .from(bookings)
      .where(
        and(
          eq(bookings.assignedDriverId, input.driverProfileId),
          inArray(bookings.status, [...OCCUPYING_STATUSES]),
          gte(bookings.scheduledAt, windowStart),
          lte(bookings.scheduledAt, windowEnd),
        ),
      )
      .limit(1);

    if (driverConflict) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `This driver is already assigned to booking ${driverConflict.referenceCode} within the conflict window. Please choose a different driver or time.`,
      });
    }

    const [vehicleConflict] = await db
      .select({ id: bookings.id, referenceCode: bookings.referenceCode })
      .from(bookings)
      .where(
        and(
          eq(bookings.assignedVehicleId, input.vehicleId),
          inArray(bookings.status, [...OCCUPYING_STATUSES]),
          gte(bookings.scheduledAt, windowStart),
          lte(bookings.scheduledAt, windowEnd),
        ),
      )
      .limit(1);

    if (vehicleConflict) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `This vehicle is already assigned to booking ${vehicleConflict.referenceCode} within the conflict window. Please choose a different vehicle or time.`,
      });
    }

    const actorId = await resolveActorId(ctx.userId);

    await db
      .update(bookings)
      .set({
        status: "assigned",
        assignedDriverId: input.driverProfileId,
        assignedVehicleId: input.vehicleId,
        dispatchedById: actorId,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, input.bookingId));

    await db.insert(bookingStatusLog).values({
      bookingId: input.bookingId,
      fromStatus: "confirmed",
      toStatus: "assigned",
      actorId,
      note: input.note ?? "Driver and vehicle assigned",
      snapshot: {
        driverProfileId: input.driverProfileId,
        vehicleId: input.vehicleId,
      },
    });

    emitBookingAssigned({
      bookingId: input.bookingId,
      referenceCode: booking.referenceCode,
      driverProfileId: input.driverProfileId,
      driverUserId: driverProfile.userId,
      vehicleId: input.vehicleId,
      actorId,
    });
    emitBookingStatusChanged({
      bookingId: input.bookingId,
      referenceCode: booking.referenceCode,
      fromStatus: "confirmed",
      toStatus: "assigned",
      actorId,
    });

    return { success: true };
  }),

  // ─── Operator: cancel booking ───────────────────────────────────────────────

  cancel: dispatcherProcedure.input(CancelBookingSchema).mutation(async ({ input, ctx }) => {
    const [booking] = await db
      .select({ id: bookings.id, status: bookings.status, referenceCode: bookings.referenceCode })
      .from(bookings)
      .where(eq(bookings.id, input.bookingId))
      .limit(1);

    if (!booking) throw new TRPCError({ code: "NOT_FOUND" });

    const validNext = BOOKING_STATUS_TRANSITIONS[booking.status];
    if (!validNext.includes("canceled")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot cancel a booking in status "${booking.status}".`,
      });
    }

    const actorId = await resolveActorId(ctx.userId);
    const now = new Date();

    await db
      .update(bookings)
      .set({
        status: "canceled",
        canceledAt: now,
        canceledById: actorId,
        cancelReason: input.reason,
        updatedAt: now,
      })
      .where(eq(bookings.id, input.bookingId));

    await db.insert(bookingStatusLog).values({
      bookingId: input.bookingId,
      fromStatus: booking.status,
      toStatus: "canceled",
      actorId,
      note: input.reason,
      snapshot: { canceledBy: "operator" },
    });

    emitBookingStatusChanged({
      bookingId: input.bookingId,
      referenceCode: booking.referenceCode,
      fromStatus: booking.status,
      toStatus: "canceled",
      actorId,
    });

    return { success: true };
  }),
});
