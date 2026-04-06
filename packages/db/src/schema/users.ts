import { pgTable, pgEnum, text, timestamp, boolean, uuid, index } from "drizzle-orm/pg-core";
import { USER_ROLES } from "@raylak/shared/enums";

export const userRoleEnum = pgEnum("user_role", USER_ROLES);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable to support guest-booked customer records; linked on Clerk sign-up
    clerkId: text("clerk_id").unique(),
    email: text("email").notNull().unique(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    role: userRoleEnum("role").notNull().default("customer"),
    isActive: boolean("is_active").notNull().default(true),

    // Reserved for future Adero multi-tenant layer.
    // When Adero is introduced, this will reference a company_accounts row.
    // companyId: uuid("company_id").references(() => companyAccounts.id),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_clerk_id_idx").on(t.clerkId), index("users_email_idx").on(t.email)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
