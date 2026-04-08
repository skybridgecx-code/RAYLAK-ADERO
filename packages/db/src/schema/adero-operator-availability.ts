import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { aderoUsers } from "./adero-users";

export const aderoOperatorAvailability = pgTable(
  "adero_operator_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => aderoUsers.id),
    availabilityStatus: text("availability_status").notNull().default("offline"),
    serviceArea: text("service_area"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("adero_operator_availability_user_id_uidx").on(t.userId),
    index("adero_operator_availability_status_idx").on(t.availabilityStatus),
  ],
);

export type AderoOperatorAvailability = typeof aderoOperatorAvailability.$inferSelect;
export type NewAderoOperatorAvailability = typeof aderoOperatorAvailability.$inferInsert;

export const ADERO_OPERATOR_AVAILABILITY_STATUSES = [
  "available",
  "busy",
  "offline",
] as const;

export type AderoOperatorAvailabilityStatus =
  (typeof ADERO_OPERATOR_AVAILABILITY_STATUSES)[number];

export const ADERO_OPERATOR_AVAILABILITY_STATUS_LABELS: Record<
  AderoOperatorAvailabilityStatus,
  string
> = {
  available: "Available",
  busy: "Busy",
  offline: "Offline",
};
