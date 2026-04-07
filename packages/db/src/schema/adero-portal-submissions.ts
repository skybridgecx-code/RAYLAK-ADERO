import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { aderoCompanyProfiles, aderoOperatorProfiles } from "./adero-profiles";

export const ADERO_PORTAL_SUBMISSION_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "needs_follow_up",
] as const;

export type AderoPortalSubmissionStatus = (typeof ADERO_PORTAL_SUBMISSION_STATUSES)[number];

/**
 * Member portal document submission records.
 *
 * When a member uses the token-gated portal to notify Adero of a document
 * submission, a row is inserted here. Admin staff review and resolve it.
 * File metadata (S3 key, original name, size) is stored when a member attaches
 * a file via the presigned S3 upload flow.
 */
export const aderoPortalSubmissions = pgTable(
  "adero_portal_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberType: text("member_type").notNull(),
    companyProfileId: uuid("company_profile_id").references(() => aderoCompanyProfiles.id),
    operatorProfileId: uuid("operator_profile_id").references(() => aderoOperatorProfiles.id),

    documentType: text("document_type").notNull(),
    memberNote: text("member_note").notNull(),

    // Optional file attachment — populated after S3 presigned upload
    fileKey: text("file_key"),       // S3 object key
    fileName: text("file_name"),     // original filename for display
    fileSizeBytes: integer("file_size_bytes"),

    // pending | accepted | rejected | needs_follow_up
    status: text("status").notNull().default("pending"),
    reviewedBy: text("reviewed_by"),
    reviewNote: text("review_note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "adero_portal_submissions_member_ref_chk",
      sql`(
        ("member_type" = 'company' AND "company_profile_id" IS NOT NULL AND "operator_profile_id" IS NULL) OR
        ("member_type" = 'operator' AND "operator_profile_id" IS NOT NULL AND "company_profile_id" IS NULL)
      )`,
    ),
    check(
      "adero_portal_submissions_status_chk",
      sql`"status" IN ('pending', 'accepted', 'rejected', 'needs_follow_up')`,
    ),
    index("adero_portal_submissions_company_profile_idx").on(t.companyProfileId, t.createdAt),
    index("adero_portal_submissions_operator_profile_idx").on(t.operatorProfileId, t.createdAt),
    index("adero_portal_submissions_status_idx").on(t.status),
    index("adero_portal_submissions_document_type_idx").on(t.documentType),
  ],
);

export type AderoPortalSubmission = typeof aderoPortalSubmissions.$inferSelect;
export type NewAderoPortalSubmission = typeof aderoPortalSubmissions.$inferInsert;
