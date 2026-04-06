import { pgTable, text, timestamp, uuid, integer, numeric, index } from "drizzle-orm/pg-core";
import { bookings } from "./bookings";

export const bookingStops = pgTable(
  "booking_stops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),

    // 1-based ordering within a booking
    sequence: integer("sequence").notNull(),

    address: text("address").notNull(),
    lat: numeric("lat", { precision: 10, scale: 7 }),
    lng: numeric("lng", { precision: 10, scale: 7 }),
    notes: text("notes"),

    // Actual arrival recorded by driver
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("booking_stops_booking_id_idx").on(t.bookingId),
    index("booking_stops_sequence_idx").on(t.bookingId, t.sequence),
  ],
);

export type BookingStop = typeof bookingStops.$inferSelect;
export type NewBookingStop = typeof bookingStops.$inferInsert;
