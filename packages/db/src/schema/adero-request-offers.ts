import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { aderoRequests } from "./adero-requests";
import { aderoUsers } from "./adero-users";

export const aderoRequestOffers = pgTable(
  "adero_request_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => aderoRequests.id),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => aderoUsers.id),
    status: text("status").notNull().default("pending"),
    offeredAt: timestamp("offered_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("adero_request_offers_request_id_idx").on(t.requestId),
    index("adero_request_offers_operator_id_idx").on(t.operatorId),
    index("adero_request_offers_status_idx").on(t.status),
    index("adero_request_offers_offered_at_idx").on(t.offeredAt),
  ],
);

export type AderoRequestOffer = typeof aderoRequestOffers.$inferSelect;
export type NewAderoRequestOffer = typeof aderoRequestOffers.$inferInsert;

export const ADERO_REQUEST_OFFER_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "expired",
] as const;

export type AderoRequestOfferStatus = (typeof ADERO_REQUEST_OFFER_STATUSES)[number];

export const ADERO_REQUEST_OFFER_STATUS_LABELS: Record<AderoRequestOfferStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};
