import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { aderoUsers } from "./adero-users";

export const aderoNotifications = pgTable(
  "adero_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => aderoUsers.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    metadata: text("metadata"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("adero_notifications_user_id_idx").on(t.userId),
    index("adero_notifications_type_idx").on(t.type),
    index("adero_notifications_created_at_idx").on(t.createdAt),
    index("adero_notifications_read_at_idx").on(t.readAt),
  ],
);

export type AderoNotification = typeof aderoNotifications.$inferSelect;
export type NewAderoNotification = typeof aderoNotifications.$inferInsert;

export const ADERO_NOTIFICATION_TYPES = [
  "offer_received",
  "offer_accepted",
  "offer_declined",
  "request_matched",
  "request_accepted",
  "trip_status_changed",
  "trip_completed",
  "trip_canceled",
] as const;

export type AderoNotificationType = (typeof ADERO_NOTIFICATION_TYPES)[number];
