import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { aderoMemberDocuments } from "./adero-member-documents";
import { aderoCompanyProfiles, aderoOperatorProfiles } from "./adero-profiles";

/**
 * Internal Adero compliance action records.
 *
 * Each row represents an internal follow-up action and doubles as a notification
 * scaffold record for compliance workflows. Current issue state is derived from
 * the latest row for a given member + document type.
 */
export const aderoDocumentComplianceNotifications = pgTable(
  "adero_document_compliance_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberType: text("member_type").notNull(),
    companyProfileId: uuid("company_profile_id").references(() => aderoCompanyProfiles.id),
    operatorProfileId: uuid("operator_profile_id").references(() => aderoOperatorProfiles.id),
    documentId: uuid("document_id").references(() => aderoMemberDocuments.id),

    documentType: text("document_type").notNull(),
    actionType: text("action_type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    notes: text("notes"),
    actorName: text("actor_name"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "adero_document_compliance_notifications_member_ref_chk",
      sql`(
        ("member_type" = 'company' AND "company_profile_id" IS NOT NULL AND "operator_profile_id" IS NULL) OR
        ("member_type" = 'operator' AND "operator_profile_id" IS NOT NULL AND "company_profile_id" IS NULL)
      )`,
    ),
    index("adero_document_compliance_notifications_document_idx").on(t.documentId, t.createdAt),
    index("adero_document_compliance_notifications_company_profile_idx").on(
      t.companyProfileId,
      t.createdAt,
    ),
    index("adero_document_compliance_notifications_operator_profile_idx").on(
      t.operatorProfileId,
      t.createdAt,
    ),
    index("adero_document_compliance_notifications_action_idx").on(t.actionType),
    index("adero_document_compliance_notifications_document_type_idx").on(t.documentType),
    index("adero_document_compliance_notifications_created_at_idx").on(t.createdAt),
  ],
);

export type AderoDocumentComplianceNotification =
  typeof aderoDocumentComplianceNotifications.$inferSelect;
export type NewAderoDocumentComplianceNotification =
  typeof aderoDocumentComplianceNotifications.$inferInsert;
