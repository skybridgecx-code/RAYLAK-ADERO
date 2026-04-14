import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { aderoCompanyProfiles, aderoOperatorProfiles } from "./adero-profiles";

/**
 * Internal staff notes on activated member profiles.
 *
 * Append-only. Each row is a free-text internal annotation added by Adero staff
 * on a company or operator profile. Notes are internal-only and never surfaced
 * to the member. Ordered newest-first when displayed.
 */
export const aderoMemberNotes = pgTable(
  "adero_member_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberType: text("member_type").notNull(),
    companyProfileId: uuid("company_profile_id").references(() => aderoCompanyProfiles.id),
    operatorProfileId: uuid("operator_profile_id").references(() => aderoOperatorProfiles.id),

    body: text("body").notNull(),
    actorName: text("actor_name"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "adero_member_notes_member_ref_chk",
      sql`(
        ("member_type" = 'company' AND "company_profile_id" IS NOT NULL AND "operator_profile_id" IS NULL) OR
        ("member_type" = 'operator' AND "operator_profile_id" IS NOT NULL AND "company_profile_id" IS NULL)
      )`,
    ),
    index("adero_member_notes_company_profile_idx").on(t.companyProfileId, t.createdAt),
    index("adero_member_notes_operator_profile_idx").on(t.operatorProfileId, t.createdAt),
    index("adero_member_notes_created_at_idx").on(t.createdAt),
  ],
);

export type AderoMemberNote = typeof aderoMemberNotes.$inferSelect;
export type NewAderoMemberNote = typeof aderoMemberNotes.$inferInsert;
