import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { VEHICLE_TYPES } from "@raylak/shared/enums";

export const vehicleTypeEnum = pgEnum("vehicle_type", VEHICLE_TYPES);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    type: vehicleTypeEnum("type").notNull(),
    licensePlate: text("license_plate").notNull().unique(),
    vin: text("vin").unique(),
    color: text("color"),
    capacity: integer("capacity").notNull().default(4),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    imageUrl: text("image_url"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vehicles_license_plate_idx").on(t.licensePlate),
    index("vehicles_type_idx").on(t.type),
  ],
);

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
