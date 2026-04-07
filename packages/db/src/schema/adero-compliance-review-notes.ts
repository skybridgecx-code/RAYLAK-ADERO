import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { aderoCompanyProfiles, aderoOperatorProfiles } from "./adero-profiles";

/**
 * Internal compliance issue review notes.
 *
 * Append-only. Each row records an internal observation or investigation note
 * for a specific compliance issue (member_type + profile_id + document_type).
 * Notes are displayed alongside the issue on the compliance dashboard and detail
 * views to give internal users a running log of investigation context.
 */
export const aderoComplianceReviewNotes = pgTable(
  "adero_compliance_review_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberType: text("member_type").notNull(),
    companyProfileId: uuid("company_profile_id").references(() => aderoCompanyProfiles.id),
    operatorProfileId: uuid("operator_profile_id").references(() => aderoOperatorProfiles.id),

    documentType: text("document_type").notNull(),
    note: text("note").notNull(),
    actorName: text("actor_name"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "adero_compliance_review_notes_member_ref_chk",
      sql`(
        ("member_type" = 'company' AND "company_profile_id" IS NOT NULL AND "operator_profile_id" IS NULL) OR
        ("member_type" = 'operator' AND "operator_profile_id" IS NOT NULL AND "company_profile_id" IS NULL)
      )`,
    ),
    index("adero_compliance_review_notes_company_profile_idx").on(
      t.companyProfileId,
      t.documentType,
      t.createdAt,
    ),
    index("adero_compliance_review_notes_operator_profile_idx").on(
      t.operatorProfileId,
      t.documentType,
      t.createdAt,
    ),
    index("adero_compliance_review_notes_member_type_idx").on(t.memberType),
    index("adero_compliance_review_notes_created_at_idx").on(t.createdAt),
  ],
);

export type AderoComplianceReviewNote = typeof aderoComplianceReviewNotes.$inferSelect;
export type NewAderoComplianceReviewNote = typeof aderoComplianceReviewNotes.$inferInsert;
