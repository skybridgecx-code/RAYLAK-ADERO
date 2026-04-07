import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { aderoCompanyProfiles, aderoOperatorProfiles } from "./adero-profiles";

/**
 * Internal compliance issue assignment records.
 *
 * One row per (member_type + profile_id + document_type). Upserted when an
 * internal user assigns or reassigns ownership of a compliance issue.
 * Assignment does not affect the compliance notification history — it only
 * tracks who is currently responsible for following up.
 */
export const aderoComplianceAssignments = pgTable(
  "adero_compliance_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberType: text("member_type").notNull(),
    companyProfileId: uuid("company_profile_id").references(() => aderoCompanyProfiles.id),
    operatorProfileId: uuid("operator_profile_id").references(() => aderoOperatorProfiles.id),

    documentType: text("document_type").notNull(),
    assignedTo: text("assigned_to").notNull(),
    assignedBy: text("assigned_by"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "adero_compliance_assignments_member_ref_chk",
      sql`(
        ("member_type" = 'company' AND "company_profile_id" IS NOT NULL AND "operator_profile_id" IS NULL) OR
        ("member_type" = 'operator' AND "operator_profile_id" IS NOT NULL AND "company_profile_id" IS NULL)
      )`,
    ),
    // Partial unique indexes — one assignment per issue per member type.
    uniqueIndex("adero_compliance_assignments_company_doc_uniq")
      .on(t.companyProfileId, t.documentType)
      .where(sql`"member_type" = 'company'`),
    uniqueIndex("adero_compliance_assignments_operator_doc_uniq")
      .on(t.operatorProfileId, t.documentType)
      .where(sql`"member_type" = 'operator'`),
    index("adero_compliance_assignments_assigned_to_idx").on(t.assignedTo),
    index("adero_compliance_assignments_member_type_idx").on(t.memberType),
    index("adero_compliance_assignments_updated_at_idx").on(t.updatedAt),
  ],
);

export type AderoComplianceAssignment = typeof aderoComplianceAssignments.$inferSelect;
export type NewAderoComplianceAssignment = typeof aderoComplianceAssignments.$inferInsert;
