import { pgTable, text, timestamp, boolean, uuid, integer, numeric, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { vehicles } from "./vehicles";

export const driverProfiles = pgTable(
  "driver_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),

    licenseNumber: text("license_number"),
    licenseExpiry: timestamp("license_expiry", { withTimezone: true }),
    licenseState: text("license_state"),

    // Currently assigned / preferred vehicle (can be overridden per booking)
    defaultVehicleId: uuid("default_vehicle_id").references(() => vehicles.id, {
      onDelete: "set null",
    }),

    isOnline: boolean("is_online").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(false),

    // Soft rating — not displayed publicly
    internalRating: integer("internal_rating"), // stored as 0-500 (0.0–5.0 × 100)

    // Driver's self-reported availability status
    // Values: available | on_ride | break | offline
    availabilityStatus: text("availability_status").notNull().default("offline"),

    bio: text("bio"),
    notes: text("notes"), // dispatcher-visible only

    // Last known GPS position — written by ride.updateLocation mutation
    lastLat: numeric("last_lat", { precision: 10, scale: 7 }),
    lastLng: numeric("last_lng", { precision: 10, scale: 7 }),
    lastHeading: integer("last_heading"),       // 0–359 degrees
    lastSpeed: numeric("last_speed", { precision: 6, scale: 2 }), // km/h
    lastLocationAt: timestamp("last_location_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("driver_profiles_user_id_idx").on(t.userId),
    index("driver_profiles_is_online_idx").on(t.isOnline),
  ],
);

export type DriverProfile = typeof driverProfiles.$inferSelect;
export type NewDriverProfile = typeof driverProfiles.$inferInsert;
