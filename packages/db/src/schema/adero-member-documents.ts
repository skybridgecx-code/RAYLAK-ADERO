import { sql } from "drizzle-orm";
import { check, date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { aderoCompanyProfiles, aderoOperatorProfiles } from "./adero-profiles";

/**
 * Internal document tracking for activated Adero members.
 *
 * This is intentionally metadata-only. It tracks operational readiness without
 * introducing file storage or broader document management concerns.
 */
export const aderoMemberDocuments = pgTable(
  "adero_member_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberType: text("member_type").notNull(),
    companyProfileId: uuid("company_profile_id").references(() => aderoCompanyProfiles.id),
    operatorProfileId: uuid("operator_profile_id").references(() => aderoOperatorProfiles.id),

    title: text("title").notNull(),
    documentType: text("document_type").notNull(),
    status: text("status").notNull(),
    expirationDate: date("expiration_date", { mode: "string" }),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "adero_member_documents_member_ref_chk",
      sql`(
        ("member_type" = 'company' AND "company_profile_id" IS NOT NULL AND "operator_profile_id" IS NULL) OR
        ("member_type" = 'operator' AND "operator_profile_id" IS NOT NULL AND "company_profile_id" IS NULL)
      )`,
    ),
    index("adero_member_documents_company_profile_idx").on(t.companyProfileId, t.updatedAt),
    index("adero_member_documents_operator_profile_idx").on(t.operatorProfileId, t.updatedAt),
    index("adero_member_documents_member_type_idx").on(t.memberType),
    index("adero_member_documents_document_type_idx").on(t.documentType),
    index("adero_member_documents_status_idx").on(t.status),
    index("adero_member_documents_expiration_date_idx").on(t.expirationDate),
  ],
);

export type AderoMemberDocument = typeof aderoMemberDocuments.$inferSelect;
export type NewAderoMemberDocument = typeof aderoMemberDocuments.$inferInsert;
