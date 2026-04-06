import { TRPCError } from "@trpc/server";
import { eq, and, inArray, desc, asc } from "drizzle-orm";
import { z } from "zod";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@raylak/db";
import { bookings, bookingStatusLog, users, driverProfiles, vehicles } from "@raylak/db";
import { AdvanceRideStatusSchema, SetDriverAvailabilitySchema, DRIVER_ALLOWED_TO_STATUSES } from "@raylak/shared/validators";
import { BOOKING_STATUS_TRANSITIONS } from "@raylak/shared/enums";
import { createTRPCRouter, driverProcedure } from "../trpc";
import {
  emitBookingStatusChanged,
  emitDriverAvailabilityChanged,
  emitDriverLocationUpdated,
} from "../../events";
import { sendDriverEnRouteSms, sendDriverArrivedSms, sendRideCompletedSms } from "../../sms";
import { sendRideCompletedEmail } from "../../email";

// Active statuses visible in the driver's queue
const QUEUE_STATUSES = [
  "assigned",
  "driver_en_route",
  "driver_arrived",
  "passenger_picked_up",
] as const;

// Terminal statuses shown in history
const HISTORY_STATUSES = ["completed", "no_show", "canceled"] as const;

const customerUsers = alias(users, "customer_users");

export const rideRouter = createTRPCRouter({
  // ─── Driver ride queue (upcoming + active) ──────────────────────────────────

  myQueue: driverProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        id: bookings.id,
        referenceCode: bookings.referenceCode,
        status: bookings.status,
        serviceType: bookings.serviceType,
        scheduledAt: bookings.scheduledAt,
        pickupAddress: bookings.pickupAddress,
        dropoffAddress: bookings.dropoffAddress,
        passengerCount: bookings.passengerCount,
        flightNumber: bookings.flightNumber,
        specialInstructions: bookings.specialInstructions,
        quotedAmount: bookings.quotedAmount,
        customerFirstName: customerUsers.firstName,
        customerLastName: customerUsers.lastName,
        customerPhone: customerUsers.phone,
        vehicleMake: vehicles.make,
        vehicleModel: vehicles.model,
        vehicleYear: vehicles.year,
        vehicleLicensePlate: vehicles.licensePlate,
        vehicleColor: vehicles.color,
      })
      .from(bookings)
      .leftJoin(customerUsers, eq(bookings.customerId, customerUsers.id))
      .leftJoin(vehicles, eq(bookings.assignedVehicleId, vehicles.id))
      .where(
        and(
          eq(bookings.assignedDriverId, ctx.driverProfileId),
          inArray(bookings.status, [...QUEUE_STATUSES]),
        ),
      )
      .orderBy(asc(bookings.scheduledAt));

    return rows;
  }),

  // ─── Single ride detail (driver-scoped) ─────────────────────────────────────

  getById: driverProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
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
          flightNumber: bookings.flightNumber,
          specialInstructions: bookings.specialInstructions,
          isPrivate: bookings.isPrivate,
          quotedAmount: bookings.quotedAmount,
          // Customer — name + phone only (no email exposed to driver)
          customerFirstName: customerUsers.firstName,
          customerLastName: customerUsers.lastName,
          customerPhone: customerUsers.phone,
          // Vehicle
          vehicleMake: vehicles.make,
          vehicleModel: vehicles.model,
          vehicleYear: vehicles.year,
          vehicleType: vehicles.type,
          vehicleLicensePlate: vehicles.licensePlate,
          vehicleColor: vehicles.color,
          vehicleCapacity: vehicles.capacity,
          vehicleAmenities: vehicles.amenities,
        })
        .from(bookings)
        .leftJoin(customerUsers, eq(bookings.customerId, customerUsers.id))
        .leftJoin(vehicles, eq(bookings.assignedVehicleId, vehicles.id))
        .where(
          and(
            eq(bookings.id, input.id),
            eq(bookings.assignedDriverId, ctx.driverProfileId), // row-level: driver's own rides only
          ),
        )
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      // Status log — last 10 entries visible to driver
      const log = await db.query.bookingStatusLog.findMany({
        where: eq(bookingStatusLog.bookingId, input.id),
        orderBy: [desc(bookingStatusLog.createdAt)],
        limit: 10,
      });

      return { ...row, statusLog: log };
    }),

  // ─── Advance ride status (driver-initiated transitions) ─────────────────────

  advanceStatus: driverProcedure
    .input(AdvanceRideStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const [booking] = await db
        .select({ id: bookings.id, status: bookings.status, assignedDriverId: bookings.assignedDriverId })
        .from(bookings)
        .where(
          and(
            eq(bookings.id, input.bookingId),
            eq(bookings.assignedDriverId, ctx.driverProfileId),
          ),
        )
        .limit(1);

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ride not found or not assigned to you." });
      }

      // Validate the requested transition against the canonical transition map
      const validNext = BOOKING_STATUS_TRANSITIONS[booking.status];
      if (!validNext.includes(input.toStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from "${booking.status}" to "${input.toStatus}".`,
        });
      }

      // Double-check it's a driver-permitted target (no cancellations from driver side)
      const driverAllowed: readonly string[] = DRIVER_ALLOWED_TO_STATUSES;
      if (!driverAllowed.includes(input.toStatus)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Status "${input.toStatus}" cannot be set by a driver.`,
        });
      }

      const now = new Date();

      await db
        .update(bookings)
        .set({
          status: input.toStatus,
          updatedAt: now,
          ...(input.toStatus === "passenger_picked_up" && { actualPickupAt: now }),
          ...(input.toStatus === "completed" && { actualDropoffAt: now }),
        })
        .where(eq(bookings.id, input.bookingId));

      await db.insert(bookingStatusLog).values({
        bookingId: input.bookingId,
        fromStatus: booking.status,
        toStatus: input.toStatus,
        actorId: ctx.driverUserId,
        note: null,
        snapshot: { source: "driver_app" },
      });

      // Fetch referenceCode for the event
      const [ref] = await db
        .select({ referenceCode: bookings.referenceCode })
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .limit(1);

      emitBookingStatusChanged({
        bookingId: input.bookingId,
        referenceCode: ref?.referenceCode ?? "",
        fromStatus: booking.status,
        toStatus: input.toStatus,
        actorId: ctx.driverUserId,
      });

      // Fire-and-forget customer notification for key status transitions
      if (
        input.toStatus === "driver_en_route" ||
        input.toStatus === "driver_arrived" ||
        input.toStatus === "completed"
      ) {
        const toStatus = input.toStatus;
        const refCode = ref?.referenceCode ?? "";
        void (async () => {
          try {
            const [bk] = await db
              .select({ customerId: bookings.customerId })
              .from(bookings)
              .where(eq(bookings.id, input.bookingId))
              .limit(1);
            if (!bk) return;
            const customer = await db.query.users.findFirst({
              where: eq(users.id, bk.customerId),
              columns: { email: true, firstName: true, phone: true },
            });
            if (!customer?.firstName) return;
            if (toStatus === "driver_en_route" && customer.phone) {
              await sendDriverEnRouteSms(customer.phone, customer.firstName, refCode);
            } else if (toStatus === "driver_arrived" && customer.phone) {
              await sendDriverArrivedSms(customer.phone, customer.firstName);
            } else if (toStatus === "completed") {
              if (customer.phone) await sendRideCompletedSms(customer.phone, customer.firstName);
              if (customer.email) await sendRideCompletedEmail({ to: customer.email, firstName: customer.firstName, referenceCode: refCode });
            }
          } catch (err) {
            console.error("[notify] ride status notification failed:", err);
          }
        })();
      }

      return { success: true };
    }),

  // ─── Driver ride history ────────────────────────────────────────────────────

  history: driverProcedure
    .input(
      z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { page, limit } = input;
      const offset = (page - 1) * limit;

      const rows = await db
        .select({
          id: bookings.id,
          referenceCode: bookings.referenceCode,
          status: bookings.status,
          serviceType: bookings.serviceType,
          scheduledAt: bookings.scheduledAt,
          pickupAddress: bookings.pickupAddress,
          dropoffAddress: bookings.dropoffAddress,
          quotedAmount: bookings.quotedAmount,
          customerFirstName: customerUsers.firstName,
          customerLastName: customerUsers.lastName,
        })
        .from(bookings)
        .leftJoin(customerUsers, eq(bookings.customerId, customerUsers.id))
        .where(
          and(
            eq(bookings.assignedDriverId, ctx.driverProfileId),
            inArray(bookings.status, [...HISTORY_STATUSES]),
          ),
        )
        .orderBy(desc(bookings.scheduledAt))
        .limit(limit)
        .offset(offset);

      return { items: rows, page, limit };
    }),

  // ─── Driver availability status ─────────────────────────────────────────────

  setAvailability: driverProcedure
    .input(SetDriverAvailabilitySchema)
    .mutation(async ({ input, ctx }) => {
      const isOnline = input.status === "available" || input.status === "on_ride";

      await db
        .update(driverProfiles)
        .set({
          availabilityStatus: input.status,
          isOnline,
          updatedAt: new Date(),
        })
        .where(eq(driverProfiles.id, ctx.driverProfileId));

      emitDriverAvailabilityChanged({
        driverProfileId: ctx.driverProfileId,
        status: input.status,
      });

      return { success: true };
    }),

  // ─── Driver location update ──────────────────────────────────────────────────

  updateLocation: driverProcedure
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        heading: z.number().int().min(0).max(359).optional(),
        speed: z.number().min(0).optional(), // km/h
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const now = new Date();

      await db
        .update(driverProfiles)
        .set({
          lastLat: String(input.lat),
          lastLng: String(input.lng),
          lastHeading: input.heading ?? null,
          lastSpeed: input.speed !== undefined ? String(input.speed) : null,
          lastLocationAt: now,
          updatedAt: now,
        })
        .where(eq(driverProfiles.id, ctx.driverProfileId));

      emitDriverLocationUpdated({
        driverProfileId: ctx.driverProfileId,
        lat: input.lat,
        lng: input.lng,
        heading: input.heading ?? null,
        speed: input.speed ?? null,
      });

      return { success: true };
    }),

  // ─── Driver's current profile (for home screen header) ──────────────────────

  me: driverProcedure.query(async ({ ctx }) => {
    const [row] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        isOnline: driverProfiles.isOnline,
        availabilityStatus: driverProfiles.availabilityStatus,
        isVerified: driverProfiles.isVerified,
      })
      .from(driverProfiles)
      .leftJoin(users, eq(driverProfiles.userId, users.id))
      .where(eq(driverProfiles.id, ctx.driverProfileId))
      .limit(1);

    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return row;
  }),
});
