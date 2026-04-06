import { TRPCError } from "@trpc/server";
import { eq, desc, count, ilike, or, and, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@raylak/db";
import { driverProfiles, users, vehicles } from "@raylak/db";
import { DriverSchema } from "@raylak/shared/validators";
import { createTRPCRouter, dispatcherProcedure, adminProcedure } from "../trpc";

export const driverRouter = createTRPCRouter({
  list: dispatcherProcedure
    .input(
      z.object({
        search: z.string().optional(),
        isActive: z.boolean().optional(),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const { search, isActive, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (typeof isActive === "boolean") conditions.push(eq(users.isActive, isActive));
      if (search) {
        const s = `%${search}%`;
        conditions.push(or(ilike(users.firstName, s), ilike(users.lastName, s), ilike(users.email, s)));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totalRows] = await Promise.all([
        db
          .select({
            id: driverProfiles.id,
            userId: driverProfiles.userId,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: users.phone,
            isActive: users.isActive,
            isOnline: driverProfiles.isOnline,
            isVerified: driverProfiles.isVerified,
            licenseNumber: driverProfiles.licenseNumber,
            licenseState: driverProfiles.licenseState,
            defaultVehicleId: driverProfiles.defaultVehicleId,
            vehicleMake: vehicles.make,
            vehicleModel: vehicles.model,
            createdAt: driverProfiles.createdAt,
          })
          .from(driverProfiles)
          .leftJoin(users, eq(driverProfiles.userId, users.id))
          .leftJoin(vehicles, eq(driverProfiles.defaultVehicleId, vehicles.id))
          .where(where)
          .orderBy(desc(driverProfiles.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(driverProfiles)
          .leftJoin(users, eq(driverProfiles.userId, users.id))
          .where(where),
      ]);

      return { items: rows, total: totalRows[0]?.value ?? 0, page, limit };
    }),

  getById: dispatcherProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select({
          id: driverProfiles.id,
          userId: driverProfiles.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
          isActive: users.isActive,
          isOnline: driverProfiles.isOnline,
          isVerified: driverProfiles.isVerified,
          licenseNumber: driverProfiles.licenseNumber,
          licenseState: driverProfiles.licenseState,
          licenseExpiry: driverProfiles.licenseExpiry,
          defaultVehicleId: driverProfiles.defaultVehicleId,
          bio: driverProfiles.bio,
          notes: driverProfiles.notes,
          internalRating: driverProfiles.internalRating,
          createdAt: driverProfiles.createdAt,
        })
        .from(driverProfiles)
        .leftJoin(users, eq(driverProfiles.userId, users.id))
        .where(eq(driverProfiles.id, input.id))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  /**
   * Expose Clerk link status + location for the operator detail page.
   * Separate query so getById stays lean for the edit form.
   */
  getStatus: dispatcherProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select({
          id: driverProfiles.id,
          userId: driverProfiles.userId,
          clerkId: users.clerkId,
          availabilityStatus: driverProfiles.availabilityStatus,
          isOnline: driverProfiles.isOnline,
          lastLat: driverProfiles.lastLat,
          lastLng: driverProfiles.lastLng,
          lastHeading: driverProfiles.lastHeading,
          lastSpeed: driverProfiles.lastSpeed,
          lastLocationAt: driverProfiles.lastLocationAt,
        })
        .from(driverProfiles)
        .leftJoin(users, eq(driverProfiles.userId, users.id))
        .where(eq(driverProfiles.id, input.id))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  /**
   * Manually link a driver's user record to a Clerk account.
   * Used by operators when automatic email-based linking hasn't triggered
   * (e.g., driver signed up with a different email on Clerk).
   * Admin-only: mutating auth linkage is higher privilege than dispatch ops.
   */
  setClerkId: adminProcedure
    .input(
      z.object({
        driverProfileId: z.string().uuid(),
        /** Clerk user ID (starts with "user_") or empty string to unlink */
        clerkId: z.string().regex(/^(user_[a-zA-Z0-9]+)?$/, {
          message: 'Clerk user ID must start with "user_" or be empty to unlink.',
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const profile = await db.query.driverProfiles.findFirst({
        where: eq(driverProfiles.id, input.driverProfileId),
        columns: { userId: true },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

      const clerkIdValue = input.clerkId === "" ? null : input.clerkId;

      // Guard: don't allow a clerkId that's already assigned to a different user
      if (clerkIdValue) {
        const conflict = await db.query.users.findFirst({
          where: eq(users.clerkId, clerkIdValue),
          columns: { id: true },
        });
        if (conflict && conflict.id !== profile.userId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This Clerk ID is already linked to a different user account.",
          });
        }
      }

      await db
        .update(users)
        .set({ clerkId: clerkIdValue, updatedAt: new Date() })
        .where(eq(users.id, profile.userId));

      return { success: true };
    }),

  create: dispatcherProcedure.input(DriverSchema).mutation(async ({ input }) => {
    const email = input.email.toLowerCase().trim();

    // Prevent duplicate email
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, role: true },
    });
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A user with this email already exists. Edit their profile to add driver details.",
      });
    }

    // Create user record for the driver (no Clerk account yet)
    const [user] = await db
      .insert(users)
      .values({
        clerkId: null,
        email,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() ?? null,
        role: "driver",
        isActive: input.isActive,
      })
      .returning({ id: users.id });

    if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [profile] = await db
      .insert(driverProfiles)
      .values({
        userId: user.id,
        licenseNumber: input.licenseNumber ?? null,
        licenseState: input.licenseState ?? null,
        licenseExpiry: input.licenseExpiry ?? null,
        defaultVehicleId: input.defaultVehicleId ?? null,
        isVerified: input.isVerified,
        bio: input.bio ?? null,
        notes: input.notes ?? null,
      })
      .returning({ id: driverProfiles.id });

    if (!profile) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return { id: profile.id };
  }),

  update: dispatcherProcedure
    .input(DriverSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const profile = await db.query.driverProfiles.findFirst({
        where: eq(driverProfiles.id, input.id),
        columns: { id: true, userId: true },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

      await Promise.all([
        db
          .update(users)
          .set({
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            phone: input.phone?.trim() ?? null,
            isActive: input.isActive,
            updatedAt: new Date(),
          })
          .where(eq(users.id, profile.userId)),
        db
          .update(driverProfiles)
          .set({
            licenseNumber: input.licenseNumber ?? null,
            licenseState: input.licenseState ?? null,
            licenseExpiry: input.licenseExpiry ?? null,
            defaultVehicleId: input.defaultVehicleId ?? null,
            isVerified: input.isVerified,
            bio: input.bio ?? null,
            notes: input.notes ?? null,
            updatedAt: new Date(),
          })
          .where(eq(driverProfiles.id, input.id)),
      ]);

      return { success: true };
    }),

  setOnline: dispatcherProcedure
    .input(z.object({ id: z.string().uuid(), isOnline: z.boolean() }))
    .mutation(async ({ input }) => {
      await db
        .update(driverProfiles)
        .set({ isOnline: input.isOnline, updatedAt: new Date() })
        .where(eq(driverProfiles.id, input.id));
      return { success: true };
    }),

  /**
   * Returns all active drivers with a known location for the dispatcher map.
   * Only includes drivers who have reported a location (lastLat/lastLng set).
   */
  listForMap: dispatcherProcedure.query(async () => {
    const rows = await db
      .select({
        id: driverProfiles.id,
        firstName: users.firstName,
        lastName: users.lastName,
        isOnline: driverProfiles.isOnline,
        availabilityStatus: driverProfiles.availabilityStatus,
        lastLat: driverProfiles.lastLat,
        lastLng: driverProfiles.lastLng,
        lastHeading: driverProfiles.lastHeading,
        lastSpeed: driverProfiles.lastSpeed,
        lastLocationAt: driverProfiles.lastLocationAt,
      })
      .from(driverProfiles)
      .leftJoin(users, eq(driverProfiles.userId, users.id))
      .where(and(isNotNull(driverProfiles.lastLat), eq(users.isActive, true)));

    return rows;
  }),
});
