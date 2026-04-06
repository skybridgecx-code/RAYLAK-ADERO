import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { BOOKING_STATUSES, SERVICE_TYPES } from "@raylak/shared/enums";
import { users } from "./users";
import { vehicles } from "./vehicles";
import { driverProfiles } from "./driver-profiles";

export const bookingStatusEnum = pgEnum("booking_status", BOOKING_STATUSES);
export const serviceTypeEnum = pgEnum("service_type", SERVICE_TYPES);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Human-readable reference shown to customers and dispatchers
    referenceCode: text("reference_code").notNull().unique(),

    status: bookingStatusEnum("status").notNull().default("new_request"),
    serviceType: serviceTypeEnum("service_type").notNull(),

    // Parties
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id),
    assignedDriverId: uuid("assigned_driver_id").references(() => driverProfiles.id, {
      onDelete: "set null",
    }),
    assignedVehicleId: uuid("assigned_vehicle_id").references(() => vehicles.id, {
      onDelete: "set null",
    }),
    dispatchedById: uuid("dispatched_by_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Schedule
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    actualPickupAt: timestamp("actual_pickup_at", { withTimezone: true }),
    actualDropoffAt: timestamp("actual_dropoff_at", { withTimezone: true }),

    // Primary route (additional stops in booking_stops table)
    pickupAddress: text("pickup_address").notNull(),
    pickupLat: numeric("pickup_lat", { precision: 10, scale: 7 }),
    pickupLng: numeric("pickup_lng", { precision: 10, scale: 7 }),
    dropoffAddress: text("dropoff_address").notNull(),
    dropoffLat: numeric("dropoff_lat", { precision: 10, scale: 7 }),
    dropoffLng: numeric("dropoff_lng", { precision: 10, scale: 7 }),

    passengerCount: integer("passenger_count").notNull().default(1),
    flightNumber: text("flight_number"),
    specialInstructions: text("special_instructions"),

    // Pricing
    quotedAmount: numeric("quoted_amount", { precision: 10, scale: 2 }),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }),
    currency: text("currency").notNull().default("USD"),

    // Privacy flag for VIP clients
    isPrivate: boolean("is_private").notNull().default(false),

    // Acquisition tracking — how the customer found RAYLAK
    acquisitionSource: text("acquisition_source"),

    // Cancellation
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    canceledById: uuid("canceled_by_id").references(() => users.id, { onDelete: "set null" }),
    cancelReason: text("cancel_reason"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bookings_reference_code_idx").on(t.referenceCode),
    index("bookings_status_idx").on(t.status),
    index("bookings_customer_id_idx").on(t.customerId),
    index("bookings_driver_id_idx").on(t.assignedDriverId),
    index("bookings_scheduled_at_idx").on(t.scheduledAt),
  ],
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
