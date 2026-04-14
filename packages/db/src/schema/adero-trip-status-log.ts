import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { aderoTrips } from "./adero-trips";
import { aderoUsers } from "./adero-users";

/**
 * Immutable audit trail for all Adero trip status transitions.
 * Never update or delete rows in this table.
 */
export const aderoTripStatusLog = pgTable(
  "adero_trip_status_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => aderoTrips.id, { onDelete: "cascade" }),
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => aderoUsers.id),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("adero_trip_status_log_trip_id_idx").on(t.tripId),
    index("adero_trip_status_log_changed_by_idx").on(t.changedBy),
    index("adero_trip_status_log_created_at_idx").on(t.createdAt),
  ],
);

export type AderoTripStatusLog = typeof aderoTripStatusLog.$inferSelect;
export type NewAderoTripStatusLog = typeof aderoTripStatusLog.$inferInsert;
