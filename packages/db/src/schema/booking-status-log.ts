import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { bookings } from "./bookings";
import { bookingStatusEnum } from "./bookings";
import { users } from "./users";

/**
 * Immutable audit trail for all booking status transitions.
 * Never update or delete rows in this table.
 */
export const bookingStatusLog = pgTable(
  "booking_status_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),

    fromStatus: bookingStatusEnum("from_status"),
    toStatus: bookingStatusEnum("to_status").notNull(),

    // Who triggered the transition (null = system)
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),

    note: text("note"),

    // Snapshot of relevant booking fields at transition time
    snapshot: jsonb("snapshot"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("booking_status_log_booking_id_idx").on(t.bookingId),
    index("booking_status_log_created_at_idx").on(t.createdAt),
  ],
);

export type BookingStatusLog = typeof bookingStatusLog.$inferSelect;
export type NewBookingStatusLog = typeof bookingStatusLog.$inferInsert;
