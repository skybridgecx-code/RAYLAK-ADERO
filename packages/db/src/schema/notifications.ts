import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Internal notification records.
 * Created server-side when operational events occur that need human attention.
 * Delivery channels (email, SMS, push, in_app) are tracked per row.
 *
 * This table is written by the notification service (apps/web/lib/notifications.ts)
 * and consumed by the in-app notification feed (Phase 7+).
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Recipient
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // What happened
    type: text("type").notNull(),   // e.g. "booking_status_change" | "assignment" | "cancellation"
    title: text("title").notNull(),
    body: text("body"),

    // Structured payload for deep linking / rendering
    data: jsonb("data"),

    // Delivery channel: "in_app" | "email" | "sms" | "push"
    channel: text("channel").notNull().default("in_app"),

    // Timestamps
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_created_at_idx").on(t.createdAt),
    index("notifications_read_at_idx").on(t.readAt),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
