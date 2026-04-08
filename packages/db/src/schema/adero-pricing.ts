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
} from "drizzle-orm/pg-core";
import { aderoRequests } from "./adero-requests";
import { aderoTrips } from "./adero-trips";
import { aderoUsers } from "./adero-users";

export const aderoQuoteStatusEnum = pgEnum("adero_quote_status", [
  "draft",
  "sent",
  "approved",
  "rejected",
  "expired",
]);

export const aderoInvoiceStatusEnum = pgEnum("adero_invoice_status", [
  "draft",
  "issued",
  "paid",
  "partially_paid",
  "overdue",
  "canceled",
  "refunded",
]);

export const aderoPaymentStatusEnum = pgEnum("adero_payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
  "disputed",
]);

export const aderoPaymentMethodEnum = pgEnum("adero_payment_method", [
  "stripe",
  "bank_transfer",
  "manual",
]);

export const aderoPricingTierEnum = pgEnum("adero_pricing_tier", [
  "standard",
  "premium",
  "surge",
  "custom",
]);

export const aderoPricingRules = pgTable(
  "adero_pricing_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceType: text("service_type").notNull(),
    pricingTier: aderoPricingTierEnum("pricing_tier").notNull().default("standard"),
    baseFare: numeric("base_fare", { precision: 10, scale: 2 }).notNull(),
    perMileRate: numeric("per_mile_rate", { precision: 10, scale: 2 }).notNull(),
    perMinuteRate: numeric("per_minute_rate", { precision: 10, scale: 2 }).notNull(),
    minimumFare: numeric("minimum_fare", { precision: 10, scale: 2 }).notNull(),
    surgeMultiplier: numeric("surge_multiplier", { precision: 4, scale: 2 })
      .notNull()
      .default("1.00"),
    currency: text("currency").notNull().default("usd"),
    isActive: boolean("is_active").notNull().default(true),
    effectiveFrom: timestamp("effective_from", { withTimezone: true })
      .notNull()
      .defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("adero_pricing_rules_service_type_idx").on(t.serviceType),
    index("adero_pricing_rules_pricing_tier_idx").on(t.pricingTier),
    index("adero_pricing_rules_is_active_idx").on(t.isActive),
    index("adero_pricing_rules_effective_from_idx").on(t.effectiveFrom),
  ],
);

export const aderoQuotes = pgTable(
  "adero_quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => aderoRequests.id),
    pricingRuleId: uuid("pricing_rule_id").references(() => aderoPricingRules.id),
    status: aderoQuoteStatusEnum("status").notNull().default("draft"),
    baseFare: numeric("base_fare", { precision: 10, scale: 2 }).notNull(),
    distanceCharge: numeric("distance_charge", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    timeCharge: numeric("time_charge", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    surgeCharge: numeric("surge_charge", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    tolls: numeric("tolls", { precision: 10, scale: 2 }).notNull().default("0.00"),
    gratuity: numeric("gratuity", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    discount: numeric("discount", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).notNull().default("0.0000"),
    taxAmount: numeric("tax_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("usd"),
    estimatedDistanceMiles: numeric("estimated_distance_miles", { precision: 8, scale: 2 }),
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    notes: text("notes"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("adero_quotes_request_id_idx").on(t.requestId),
    index("adero_quotes_pricing_rule_id_idx").on(t.pricingRuleId),
    index("adero_quotes_status_idx").on(t.status),
    index("adero_quotes_expires_at_idx").on(t.expiresAt),
    index("adero_quotes_created_at_idx").on(t.createdAt),
  ],
);

export const aderoInvoices = pgTable(
  "adero_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceNumber: text("invoice_number").notNull(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => aderoTrips.id),
    quoteId: uuid("quote_id").references(() => aderoQuotes.id),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => aderoUsers.id),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => aderoUsers.id),
    status: aderoInvoiceStatusEnum("status").notNull().default("draft"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).notNull().default("0.0000"),
    taxAmount: numeric("tax_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
    currency: text("currency").notNull().default("usd"),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    notes: text("notes"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("adero_invoices_invoice_number_uidx").on(t.invoiceNumber),
    index("adero_invoices_trip_id_idx").on(t.tripId),
    index("adero_invoices_quote_id_idx").on(t.quoteId),
    index("adero_invoices_requester_id_idx").on(t.requesterId),
    index("adero_invoices_operator_id_idx").on(t.operatorId),
    index("adero_invoices_status_idx").on(t.status),
    index("adero_invoices_due_date_idx").on(t.dueDate),
    index("adero_invoices_created_at_idx").on(t.createdAt),
  ],
);

export const aderoPayments = pgTable(
  "adero_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => aderoInvoices.id),
    status: aderoPaymentStatusEnum("status").notNull().default("pending"),
    method: aderoPaymentMethodEnum("method").notNull().default("stripe"),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("usd"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeChargeId: text("stripe_charge_id"),
    failureReason: text("failure_reason"),
    refundedAmount: numeric("refunded_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    metadata: jsonb("metadata"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("adero_payments_stripe_payment_intent_id_uidx").on(
      t.stripePaymentIntentId,
    ),
    index("adero_payments_invoice_id_idx").on(t.invoiceId),
    index("adero_payments_status_idx").on(t.status),
    index("adero_payments_method_idx").on(t.method),
    index("adero_payments_processed_at_idx").on(t.processedAt),
    index("adero_payments_created_at_idx").on(t.createdAt),
  ],
);

export const aderoOperatorStripeAccounts = pgTable(
  "adero_operator_stripe_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => aderoUsers.id),
    stripeAccountId: text("stripe_account_id").notNull(),
    chargesEnabled: boolean("charges_enabled").notNull().default(false),
    payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
    detailsSubmitted: boolean("details_submitted").notNull().default(false),
    onboardingComplete: boolean("onboarding_complete").notNull().default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("adero_operator_stripe_accounts_operator_id_uidx").on(t.operatorId),
    uniqueIndex("adero_operator_stripe_accounts_stripe_account_id_uidx").on(
      t.stripeAccountId,
    ),
    index("adero_operator_stripe_accounts_created_at_idx").on(t.createdAt),
  ],
);

export const aderoPlatformFees = pgTable(
  "adero_platform_fees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => aderoInvoices.id),
    paymentId: uuid("payment_id").references(() => aderoPayments.id),
    feeType: text("fee_type").notNull().default("platform_commission"),
    feePercent: numeric("fee_percent", { precision: 5, scale: 4 }).notNull(),
    feeAmount: numeric("fee_amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("usd"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("adero_platform_fees_invoice_id_idx").on(t.invoiceId),
    index("adero_platform_fees_payment_id_idx").on(t.paymentId),
    index("adero_platform_fees_fee_type_idx").on(t.feeType),
    index("adero_platform_fees_created_at_idx").on(t.createdAt),
  ],
);

export type AderoPricingRule = typeof aderoPricingRules.$inferSelect;
export type NewAderoPricingRule = typeof aderoPricingRules.$inferInsert;

export type AderoQuote = typeof aderoQuotes.$inferSelect;
export type NewAderoQuote = typeof aderoQuotes.$inferInsert;

export type AderoInvoice = typeof aderoInvoices.$inferSelect;
export type NewAderoInvoice = typeof aderoInvoices.$inferInsert;

export type AderoPayment = typeof aderoPayments.$inferSelect;
export type NewAderoPayment = typeof aderoPayments.$inferInsert;

export type AderoOperatorStripeAccount =
  typeof aderoOperatorStripeAccounts.$inferSelect;
export type NewAderoOperatorStripeAccount =
  typeof aderoOperatorStripeAccounts.$inferInsert;

export type AderoPlatformFee = typeof aderoPlatformFees.$inferSelect;
export type NewAderoPlatformFee = typeof aderoPlatformFees.$inferInsert;
