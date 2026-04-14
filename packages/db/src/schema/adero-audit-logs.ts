import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { aderoCompanyApplications, aderoOperatorApplications } from "./adero-applications";
import { aderoCompanyProfiles, aderoOperatorProfiles } from "./adero-profiles";

/**
 * Adero internal audit trail.
 *
 * Generic by design so application and activated member profile changes can be
 * read chronologically without introducing a broader event system.
 */
export const aderoAuditLogs = pgTable(
  "adero_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    applicationId: uuid("application_id"),
    companyApplicationId: uuid("company_application_id").references(
      () => aderoCompanyApplications.id,
    ),
    operatorApplicationId: uuid("operator_application_id").references(
      () => aderoOperatorApplications.id,
    ),
    companyProfileId: uuid("company_profile_id").references(() => aderoCompanyProfiles.id),
    operatorProfileId: uuid("operator_profile_id").references(() => aderoOperatorProfiles.id),
    action: text("action").notNull(),
    actorName: text("actor_name"),
    summary: text("summary").notNull(),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("adero_audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("adero_audit_logs_application_id_idx").on(t.applicationId),
    index("adero_audit_logs_company_application_idx").on(t.companyApplicationId),
    index("adero_audit_logs_operator_application_idx").on(t.operatorApplicationId),
    index("adero_audit_logs_company_profile_idx").on(t.companyProfileId),
    index("adero_audit_logs_operator_profile_idx").on(t.operatorProfileId),
    index("adero_audit_logs_created_at_idx").on(t.createdAt),
  ],
);

export type AderoAuditLog = typeof aderoAuditLogs.$inferSelect;
export type NewAderoAuditLog = typeof aderoAuditLogs.$inferInsert;
