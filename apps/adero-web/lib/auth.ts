import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@raylak/db";
import {
  aderoUsers,
  aderoCompanyProfiles,
  aderoOperatorProfiles,
} from "@raylak/db/schema";
import { eq } from "drizzle-orm";
import type { AderoRole, AderoUser } from "@raylak/db/schema";

/**
 * Returns the authenticated Clerk userId for Adero.
 * Throws if the user is not authenticated.
 */
export async function requireAderoAuth(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session.userId) {
    throw new Error("Unauthenticated");
  }
  return { userId: session.userId };
}

/**
 * Resolves (or creates) the Adero user record for the current Clerk session.
 *
 * On first sign-in:
 *   1. Checks if the Clerk email matches an existing company profile -> role "company"
 *   2. Checks if the Clerk email matches an existing operator profile -> role "operator"
 *   3. Otherwise -> role "requester"
 *
 * On subsequent visits, returns the existing adero_users row.
 */
export async function resolveAderoUser(): Promise<AderoUser | null> {
  const session = await auth();
  if (!session.userId) {
    return null;
  }

  const existing = await db
    .select()
    .from(aderoUsers)
    .where(eq(aderoUsers.clerkId, session.userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0]!;
  }

  const user = await currentUser();
  if (!user) {
    return null;
  }

  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

  if (!email) {
    return null;
  }

  let role: AderoRole = "requester";
  let companyProfileId: string | null = null;
  let operatorProfileId: string | null = null;

  const companyMatch = await db
    .select({ id: aderoCompanyProfiles.id })
    .from(aderoCompanyProfiles)
    .where(eq(aderoCompanyProfiles.email, email))
    .limit(1);

  if (companyMatch.length > 0 && companyMatch[0]) {
    role = "company";
    companyProfileId = companyMatch[0].id;
  } else {
    const operatorMatch = await db
      .select({ id: aderoOperatorProfiles.id })
      .from(aderoOperatorProfiles)
      .where(eq(aderoOperatorProfiles.email, email))
      .limit(1);

    if (operatorMatch.length > 0 && operatorMatch[0]) {
      role = "operator";
      operatorProfileId = operatorMatch[0].id;
    }
  }

  const inserted = await db
    .insert(aderoUsers)
    .values({
      clerkId: session.userId,
      email,
      firstName: user.firstName,
      lastName: user.lastName,
      role,
      companyProfileId,
      operatorProfileId,
    })
    .onConflictDoUpdate({
      target: aderoUsers.clerkId,
      set: {
        email,
        firstName: user.firstName,
        lastName: user.lastName,
        role,
        companyProfileId,
        operatorProfileId,
      },
    })
    .returning();

  return inserted[0] ?? null;
}

/**
 * Requires a resolved Adero user. Throws if not authenticated or not resolved.
 */
export async function requireAderoUser(): Promise<AderoUser> {
  const aderoUser = await resolveAderoUser();
  if (!aderoUser) {
    throw new Error("Unauthenticated");
  }
  return aderoUser;
}

/**
 * Requires the Adero user to have one of the specified roles.
 * Throws with a forbidden message if not.
 */
export async function requireAderoRole(
  allowed: AderoRole[],
): Promise<AderoUser> {
  const aderoUser = await requireAderoUser();
  if (!allowed.includes(aderoUser.role as AderoRole)) {
    throw new Error(
      `Forbidden: requires one of [${allowed.join(", ")}], got ${aderoUser.role}`,
    );
  }
  return aderoUser;
}
