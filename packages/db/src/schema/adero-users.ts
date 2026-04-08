import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { aderoCompanyProfiles, aderoOperatorProfiles } from "./adero-profiles";

/**
 * Adero user identity table.
 *
 * Maps a Clerk identity (shared with RAYLAK) to an Adero-specific role.
 * This is the bridge between the shared auth provider and the Adero product.
 *
 * A person can be a RAYLAK user AND an Adero user simultaneously.
 * The clerkId is the link between the two product identities.
 *
 * Role resolution on first sign-in:
 *   - email matches an existing adero_company_profiles row → "company"
 *   - email matches an existing adero_operator_profiles row → "operator"
 *   - otherwise → "requester"
 *
 * Admins are promoted manually (or via seed) — never auto-assigned.
 */
export const aderoUsers = pgTable(
  "adero_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull().unique(),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    role: text("role").notNull().default("requester"),
    companyProfileId: uuid("company_profile_id").references(
      () => aderoCompanyProfiles.id,
    ),
    operatorProfileId: uuid("operator_profile_id").references(
      () => aderoOperatorProfiles.id,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("adero_users_clerk_id_uidx").on(t.clerkId),
    index("adero_users_email_idx").on(t.email),
    index("adero_users_role_idx").on(t.role),
    index("adero_users_company_profile_id_idx").on(t.companyProfileId),
    index("adero_users_operator_profile_id_idx").on(t.operatorProfileId),
  ],
);

export type AderoUser = typeof aderoUsers.$inferSelect;
export type NewAderoUser = typeof aderoUsers.$inferInsert;

export const ADERO_ROLES = [
  "requester",
  "operator",
  "company",
  "admin",
] as const;

export type AderoRole = (typeof ADERO_ROLES)[number];
