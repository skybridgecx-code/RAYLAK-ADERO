import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { aderoRequests } from "./adero-requests";
import { aderoUsers } from "./adero-users";

export const aderoTrips = pgTable(
  "adero_trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => aderoRequests.id),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => aderoUsers.id),
    status: text("status").notNull().default("assigned"),
    pickupAddress: text("pickup_address").notNull(),
    dropoffAddress: text("dropoff_address").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("adero_trips_request_id_idx").on(t.requestId),
    index("adero_trips_operator_id_idx").on(t.operatorId),
    index("adero_trips_status_idx").on(t.status),
    index("adero_trips_scheduled_at_idx").on(t.scheduledAt),
    index("adero_trips_created_at_idx").on(t.createdAt),
  ],
);

export type AderoTrip = typeof aderoTrips.$inferSelect;
export type NewAderoTrip = typeof aderoTrips.$inferInsert;

export const ADERO_TRIP_STATUSES = [
  "assigned",
  "operator_en_route",
  "operator_arrived",
  "in_progress",
  "completed",
  "canceled",
] as const;

export type AderoTripStatus = (typeof ADERO_TRIP_STATUSES)[number];

export const ADERO_TRIP_STATUS_LABELS: Record<AderoTripStatus, string> = {
  assigned: "Assigned",
  operator_en_route: "Operator En Route",
  operator_arrived: "Operator Arrived",
  in_progress: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

export const ADERO_TRIP_STATUS_TRANSITIONS: Record<
  AderoTripStatus,
  AderoTripStatus[]
> = {
  assigned: ["operator_en_route", "canceled"],
  operator_en_route: ["operator_arrived", "canceled"],
  operator_arrived: ["in_progress", "canceled"],
  in_progress: ["completed", "canceled"],
  completed: [],
  canceled: [],
};
