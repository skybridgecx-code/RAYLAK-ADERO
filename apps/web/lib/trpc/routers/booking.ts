import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@raylak/db";
import { bookings, bookingStatusLog, users } from "@raylak/db";
import { BookingIntakeSchema } from "@raylak/shared/validators";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { sendBookingConfirmation } from "../../email";

function generateReferenceCode(): string {
  // Unambiguous character set — no 0/O, 1/I/L confusion
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return `RAY-${code}`;
}

export const bookingRouter = createTRPCRouter({
  /**
   * Public booking intake — called by the customer booking form.
   * Upserts a customer record and persists the booking as new_request.
   */
  createIntake: publicProcedure.input(BookingIntakeSchema).mutation(async ({ input, ctx }) => {
    const email = input.email.toLowerCase().trim();

    // 1. Upsert customer record
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
      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create customer record" });
      customer = created;
    } else if (ctx.userId && !customer.clerkId) {
      // Link Clerk account to an existing guest record
      await db
        .update(users)
        .set({ clerkId: ctx.userId, updatedAt: new Date() })
        .where(eq(users.id, customer.id));
    }

    // 2. Generate a unique reference code (collision-safe with retry)
    let referenceCode = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateReferenceCode();
      const existing = await db.query.bookings.findFirst({
        where: eq(bookings.referenceCode, candidate),
        columns: { id: true },
      });
      if (!existing) {
        referenceCode = candidate;
        break;
      }
    }
    if (!referenceCode) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not generate reference code" });
    }

    // 3. Persist booking as new_request
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

    if (!booking) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to persist booking" });
    }

    // 4. Audit log — initial status entry
    await db.insert(bookingStatusLog).values({
      bookingId: booking.id,
      fromStatus: null,
      toStatus: "new_request",
      actorId: customer.id,
      note: "Booking submitted via website",
      snapshot: {
        referenceCode,
        serviceType: booking.serviceType,
        scheduledAt: booking.scheduledAt,
        pickupAddress: booking.pickupAddress,
        dropoffAddress: booking.dropoffAddress,
      },
    });

    // 5. Send confirmation email (fire-and-forget; failures are logged, not thrown)
    sendBookingConfirmation({
      to: email,
      firstName: input.firstName.trim(),
      referenceCode,
      serviceType: input.serviceType,
      scheduledAt: input.scheduledAt,
      pickupAddress: input.pickupAddress,
      dropoffAddress: input.dropoffAddress,
    }).catch((err: unknown) => {
      console.error("[email] Failed to send booking confirmation:", err);
    });

    return { referenceCode, bookingId: booking.id };
  }),

  /**
   * Fetch minimal booking details for the confirmation screen.
   * Returns only safe public fields — no customer PII.
   */
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

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      return booking;
    }),
});
