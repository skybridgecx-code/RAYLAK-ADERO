import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const aderoRatingRoleEnum = pgEnum("adero_rating_role", [
  "requester",
  "operator",
]);

export const aderoDisputeCategoryEnum = pgEnum("adero_dispute_category", [
  "billing",
  "service_quality",
  "no_show",
  "safety",
  "cancellation",
  "other",
]);

export const aderoDisputeStatusEnum = pgEnum("adero_dispute_status", [
  "open",
  "under_review",
  "resolved",
  "escalated",
  "dismissed",
]);

export const aderoDisputePriorityEnum = pgEnum("adero_dispute_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const aderoIncidentSeverityEnum = pgEnum("adero_incident_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const aderoIncidentCategoryEnum = pgEnum("adero_incident_category", [
  "accident",
  "safety_concern",
  "vehicle_issue",
  "passenger_behavior",
  "operator_behavior",
  "route_deviation",
  "other",
]);

export const aderoIncidentStatusEnum = pgEnum("adero_incident_status", [
  "reported",
  "investigating",
  "action_taken",
  "closed",
]);

export const aderoPenaltyTypeEnum = pgEnum("adero_penalty_type", [
  "none",
  "fee",
  "warning",
  "suspension",
]);

export const aderoTrustTierEnum = pgEnum("adero_trust_tier", [
  "new",
  "standard",
  "trusted",
  "preferred",
  "suspended",
]);

export const aderoRatings = pgTable(
  "adero_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull(),
    requestId: uuid("request_id").notNull(),
    raterUserId: uuid("rater_user_id").notNull(),
    rateeUserId: uuid("ratee_user_id").notNull(),
    raterRole: aderoRatingRoleEnum("rater_role").notNull(),
    overallScore: integer("overall_score").notNull(),
    punctualityScore: integer("punctuality_score"),
    professionalismScore: integer("professionalism_score"),
    vehicleConditionScore: integer("vehicle_condition_score"),
    communicationScore: integer("communication_score"),
    comment: text("comment"),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    tripRaterUniq: uniqueIndex("adero_ratings_trip_rater_uniq").on(
      table.tripId,
      table.raterUserId
    ),
    rateeIdx: index("adero_ratings_ratee_idx").on(table.rateeUserId),
    raterIdx: index("adero_ratings_rater_idx").on(table.raterUserId),
  })
);

export const aderoDisputes = pgTable(
  "adero_disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull(),
    requestId: uuid("request_id").notNull(),
    filedByUserId: uuid("filed_by_user_id").notNull(),
    filedAgainstUserId: uuid("filed_against_user_id"),
    category: aderoDisputeCategoryEnum("category").notNull(),
    status: aderoDisputeStatusEnum("status").notNull().default("open"),
    priority: aderoDisputePriorityEnum("priority").notNull().default("medium"),
    subject: varchar("subject", { length: 255 }).notNull(),
    description: text("description").notNull(),
    resolution: text("resolution"),
    resolvedByUserId: uuid("resolved_by_user_id"),
    resolvedAt: timestamp("resolved_at"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("adero_disputes_status_idx").on(table.status),
    filedByIdx: index("adero_disputes_filed_by_idx").on(table.filedByUserId),
    tripIdx: index("adero_disputes_trip_idx").on(table.tripId),
  })
);

export const aderoDisputeMessages = pgTable(
  "adero_dispute_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    disputeId: uuid("dispute_id").notNull(),
    senderUserId: uuid("sender_user_id"),
    senderRole: varchar("sender_role", { length: 20 }).notNull(),
    message: text("message").notNull(),
    attachmentUrl: text("attachment_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    disputeIdx: index("adero_dispute_messages_dispute_idx").on(
      table.disputeId
    ),
  })
);

export const aderoIncidents = pgTable(
  "adero_incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id"),
    reportedByUserId: uuid("reported_by_user_id").notNull(),
    severity: aderoIncidentSeverityEnum("severity").notNull(),
    category: aderoIncidentCategoryEnum("category").notNull(),
    status: aderoIncidentStatusEnum("status").notNull().default("reported"),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    location: text("location"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    adminNotes: text("admin_notes"),
    resolvedByUserId: uuid("resolved_by_user_id"),
    resolvedAt: timestamp("resolved_at"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("adero_incidents_status_idx").on(table.status),
    severityIdx: index("adero_incidents_severity_idx").on(table.severity),
    reportedByIdx: index("adero_incidents_reported_by_idx").on(
      table.reportedByUserId
    ),
  })
);

export const aderoCancelPenalties = pgTable(
  "adero_cancel_penalties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id"),
    requestId: uuid("request_id").notNull(),
    userId: uuid("user_id").notNull(),
    cancelledByRole: aderoRatingRoleEnum("cancelled_by_role").notNull(),
    reason: text("reason"),
    penaltyType: aderoPenaltyTypeEnum("penalty_type")
      .notNull()
      .default("none"),
    penaltyAmount: numeric("penalty_amount", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    waived: boolean("waived").notNull().default(false),
    waivedByUserId: uuid("waived_by_user_id"),
    waivedReason: text("waived_reason"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("adero_cancel_penalties_user_idx").on(table.userId),
    requestIdx: index("adero_cancel_penalties_request_idx").on(
      table.requestId
    ),
  })
);

export const aderoTrustScores = pgTable(
  "adero_trust_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    overallScore: numeric("overall_score", { precision: 5, scale: 2 })
      .notNull()
      .default("50.00"),
    ratingAverage: numeric("rating_average", { precision: 3, scale: 2 })
      .notNull()
      .default("0.00"),
    totalRatings: integer("total_ratings").notNull().default(0),
    completionRate: numeric("completion_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0.00"),
    cancellationRate: numeric("cancellation_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0.00"),
    disputeRate: numeric("dispute_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0.00"),
    incidentCount: integer("incident_count").notNull().default(0),
    onTimeRate: numeric("on_time_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0.00"),
    totalTrips: integer("total_trips").notNull().default(0),
    totalCancellations: integer("total_cancellations").notNull().default(0),
    totalDisputes: integer("total_disputes").notNull().default(0),
    tier: aderoTrustTierEnum("tier").notNull().default("new"),
    lastCalculatedAt: timestamp("last_calculated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userUniq: uniqueIndex("adero_trust_scores_user_uniq").on(table.userId),
    tierIdx: index("adero_trust_scores_tier_idx").on(table.tier),
  })
);

export const aderoDisputesRelations = relations(aderoDisputes, ({ many }) => ({
  messages: many(aderoDisputeMessages),
}));

export const aderoDisputeMessagesRelations = relations(
  aderoDisputeMessages,
  ({ one }) => ({
    dispute: one(aderoDisputes, {
      fields: [aderoDisputeMessages.disputeId],
      references: [aderoDisputes.id],
    }),
  })
);
