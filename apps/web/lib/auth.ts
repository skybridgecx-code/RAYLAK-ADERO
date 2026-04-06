import { auth, currentUser } from "@clerk/nextjs/server";
import type { UserRole } from "@raylak/shared/enums";

/**
 * Returns the authenticated userId.
 * Throws if the user is not authenticated.
 * Use in Server Components and Server Actions.
 */
export async function requireAuth(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session.userId) {
    throw new Error("Unauthenticated");
  }
  return { userId: session.userId };
}

/**
 * Returns the role stored in Clerk publicMetadata.
 * Falls back to "customer" if not set.
 */
export async function getAuthRole(): Promise<UserRole> {
  const user = await currentUser();
  const role = user?.publicMetadata?.["role"] as UserRole | undefined;
  return role ?? "customer";
}

/**
 * Asserts the current user has one of the required roles.
 * Throws with a 403-equivalent message if not.
 */
export async function requireRole(allowed: UserRole[]) {
  const role = await getAuthRole();
  if (!allowed.includes(role)) {
    throw new Error(`Forbidden: requires one of [${allowed.join(", ")}], got ${role}`);
  }
  return role;
}
