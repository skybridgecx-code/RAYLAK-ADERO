import { pgTable, text, timestamp, uuid, integer, index } from "drizzle-orm/pg-core";

/**
 * Adero network applications — transportation companies.
 *
 * Submitted via the /apply/company public form on adero.io.
 * Reviewed internally; status progresses: pending → under_review → approved | rejected.
 *
 * Intentionally standalone — no FK to RAYLAK's users table.
 * Adero applicants are not RAYLAK users (yet).
 */
export const aderoCompanyApplications = pgTable(
  "adero_company_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Company
    companyName: text("company_name").notNull(),
    website: text("website"),

    // Primary contact
    contactFirstName: text("contact_first_name").notNull(),
    contactLastName: text("contact_last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),

    // Operations
    fleetSize: integer("fleet_size"),
    serviceMarkets: text("service_markets").notNull(), // cities / regions they serve
    overflowNeeds: text("overflow_needs"),             // how they'd use overflow capacity

    // Internal review
    status: text("status").notNull().default("pending"), // pending | under_review | approved | rejected
    internalNotes: text("internal_notes"),

    // Timestamps
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("adero_company_apps_email_idx").on(t.email),
    index("adero_company_apps_status_idx").on(t.status),
    index("adero_company_apps_created_at_idx").on(t.createdAt),
  ],
);

export type AderoCompanyApplication = typeof aderoCompanyApplications.$inferSelect;
export type NewAderoCompanyApplication = typeof aderoCompanyApplications.$inferInsert;

/**
 * Adero network applications — independent chauffeurs / operators.
 *
 * Submitted via the /apply/operator public form on adero.io.
 */
export const aderoOperatorApplications = pgTable(
  "adero_operator_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Personal
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),

    // Location
    city: text("city").notNull(),
    state: text("state"),

    // Operations
    vehicleType: text("vehicle_type").notNull(), // sedan | suv | sprinter | van | other
    vehicleYear: integer("vehicle_year"),
    yearsExperience: integer("years_experience"),
    currentAffiliations: text("current_affiliations"), // companies they currently work with
    bio: text("bio"),                                  // why they want to join Adero

    // Internal review
    status: text("status").notNull().default("pending"),
    internalNotes: text("internal_notes"),

    // Timestamps
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("adero_operator_apps_email_idx").on(t.email),
    index("adero_operator_apps_status_idx").on(t.status),
    index("adero_operator_apps_created_at_idx").on(t.createdAt),
  ],
);

export type AderoOperatorApplication = typeof aderoOperatorApplications.$inferSelect;
export type NewAderoOperatorApplication = typeof aderoOperatorApplications.$inferInsert;
