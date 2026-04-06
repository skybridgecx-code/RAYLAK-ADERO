import { TRPCError } from "@trpc/server";
import { eq, desc, count, ilike, or, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@raylak/db";
import { vehicles } from "@raylak/db";
import { VehicleSchema } from "@raylak/shared/validators";
import { createTRPCRouter, dispatcherProcedure } from "../trpc";

export const vehicleRouter = createTRPCRouter({
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
      if (typeof isActive === "boolean") conditions.push(eq(vehicles.isActive, isActive));
      if (search) {
        const s = `%${search}%`;
        conditions.push(or(ilike(vehicles.make, s), ilike(vehicles.model, s), ilike(vehicles.licensePlate, s)));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totalRows] = await Promise.all([
        db.select().from(vehicles).where(where).orderBy(desc(vehicles.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(vehicles).where(where),
      ]);

      return { items: rows, total: totalRows[0]?.value ?? 0, page, limit };
    }),

  getById: dispatcherProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, input.id)).limit(1);
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND" });
      return vehicle;
    }),

  create: dispatcherProcedure.input(VehicleSchema).mutation(async ({ input }) => {
    const [vehicle] = await db
      .insert(vehicles)
      .values({
        make: input.make,
        model: input.model,
        year: input.year,
        type: input.type,
        licensePlate: input.licensePlate,
        vin: input.vin ?? null,
        color: input.color ?? null,
        capacity: input.capacity,
        luggageCapacity: input.luggageCapacity ?? null,
        amenities: input.amenities ?? null,
        isActive: input.isActive,
        notes: input.notes ?? null,
      })
      .returning({ id: vehicles.id });

    if (!vehicle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return { id: vehicle.id };
  }),

  update: dispatcherProcedure
    .input(VehicleSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const existing = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, input.id),
        columns: { id: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(vehicles)
        .set({
          make: input.make,
          model: input.model,
          year: input.year,
          type: input.type,
          licensePlate: input.licensePlate,
          vin: input.vin ?? null,
          color: input.color ?? null,
          capacity: input.capacity,
          luggageCapacity: input.luggageCapacity ?? null,
          amenities: input.amenities ?? null,
          isActive: input.isActive,
          notes: input.notes ?? null,
          updatedAt: new Date(),
        })
        .where(eq(vehicles.id, input.id));

      return { success: true };
    }),

  setActive: dispatcherProcedure
    .input(z.object({ id: z.string().uuid(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      await db
        .update(vehicles)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(vehicles.id, input.id));
      return { success: true };
    }),
});
