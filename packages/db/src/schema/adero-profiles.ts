import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { aderoCompanyApplications, aderoOperatorApplications } from "./adero-applications";

/**
 * Adero activated company profiles.
 *
 * These are internal network/member records created after approval + activation.
 * They intentionally point back to the immutable application history while
 * carrying the operational profile fields admins need after activation.
 */
export const aderoCompanyProfiles = pgTable(
  "adero_company_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => aderoCompanyApplications.id),

    companyName: text("company_name").notNull(),
    serviceArea: text("service_area").notNull(),
    contactName: text("contact_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    website: text("website"),
    fleetSize: integer("fleet_size"),
    serviceNotes: text("service_notes"),
    activationStatus: text("activation_status").notNull().default("active"),

    activatedAt: timestamp("activated_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("adero_company_profiles_application_id_uidx").on(t.applicationId),
    index("adero_company_profiles_status_idx").on(t.activationStatus),
    index("adero_company_profiles_company_name_idx").on(t.companyName),
    index("adero_company_profiles_activated_at_idx").on(t.activatedAt),
  ],
);

export type AderoCompanyProfile = typeof aderoCompanyProfiles.$inferSelect;
export type NewAderoCompanyProfile = typeof aderoCompanyProfiles.$inferInsert;

/**
 * Adero activated independent operator profiles.
 */
export const aderoOperatorProfiles = pgTable(
  "adero_operator_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => aderoOperatorApplications.id),

    fullName: text("full_name").notNull(),
    city: text("city").notNull(),
    state: text("state"),
    email: text("email").notNull(),
    phone: text("phone"),
    vehicleType: text("vehicle_type").notNull(),
    vehicleYear: integer("vehicle_year"),
    yearsExperience: integer("years_experience"),
    serviceNotes: text("service_notes"),
    activationStatus: text("activation_status").notNull().default("active"),

    activatedAt: timestamp("activated_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("adero_operator_profiles_application_id_uidx").on(t.applicationId),
    index("adero_operator_profiles_status_idx").on(t.activationStatus),
    index("adero_operator_profiles_full_name_idx").on(t.fullName),
    index("adero_operator_profiles_activated_at_idx").on(t.activatedAt),
  ],
);

export type AderoOperatorProfile = typeof aderoOperatorProfiles.$inferSelect;
export type NewAderoOperatorProfile = typeof aderoOperatorProfiles.$inferInsert;
