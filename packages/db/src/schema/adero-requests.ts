import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { aderoUsers } from "./adero-users";

/**
 * Adero service requests.
 *
 * Created by requesters or company users when they need transportation.
 * Status flows: submitted → matched → accepted → in_progress → completed
 * or: submitted → canceled at any point before in_progress.
 */
export const aderoRequests = pgTable(
  "adero_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => aderoUsers.id),

    serviceType: text("service_type").notNull(),
    pickupAddress: text("pickup_address").notNull(),
    dropoffAddress: text("dropoff_address").notNull(),
    pickupAt: timestamp("pickup_at", { withTimezone: true }).notNull(),
    passengerCount: integer("passenger_count").notNull(),
    vehiclePreference: text("vehicle_preference"),
    notes: text("notes"),

    status: text("status").notNull().default("submitted"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("adero_requests_requester_id_idx").on(t.requesterId),
    index("adero_requests_status_idx").on(t.status),
    index("adero_requests_pickup_at_idx").on(t.pickupAt),
    index("adero_requests_created_at_idx").on(t.createdAt),
  ],
);

export type AderoRequest = typeof aderoRequests.$inferSelect;
export type NewAderoRequest = typeof aderoRequests.$inferInsert;

export const ADERO_REQUEST_STATUSES = [
  "submitted",
  "matched",
  "accepted",
  "in_progress",
  "completed",
  "canceled",
] as const;

export type AderoRequestStatus = (typeof ADERO_REQUEST_STATUSES)[number];

export const ADERO_REQUEST_STATUS_LABELS: Record<AderoRequestStatus, string> = {
  submitted: "Submitted",
  matched: "Matched",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

export const ADERO_SERVICE_TYPES = [
  "sedan",
  "suv",
  "sprinter_van",
  "passenger_van",
  "limousine",
  "coach_bus",
  "other",
] as const;

export type AderoServiceType = (typeof ADERO_SERVICE_TYPES)[number];

export const ADERO_SERVICE_TYPE_LABELS: Record<AderoServiceType, string> = {
  sedan: "Sedan",
  suv: "SUV",
  sprinter_van: "Sprinter Van",
  passenger_van: "Passenger Van",
  limousine: "Limousine",
  coach_bus: "Coach Bus",
  other: "Other",
};
