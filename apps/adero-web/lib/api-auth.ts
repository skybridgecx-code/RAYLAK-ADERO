import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { aderoUsers, db } from "@raylak/db";
import type { AderoUser } from "@raylak/db/schema";
import { resolveAderoUser } from "@/lib/auth";

export class ApiAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function authenticateRequest(): Promise<{ user: AderoUser }> {
  const { userId } = await auth();

  if (!userId) {
    throw new ApiAuthError("Unauthorized", 401);
  }

  const [existing] = await db
    .select()
    .from(aderoUsers)
    .where(eq(aderoUsers.clerkId, userId))
    .limit(1);

  if (existing) {
    return { user: existing };
  }

  const resolved = await resolveAderoUser();
  if (!resolved) {
    throw new ApiAuthError("Forbidden", 403);
  }

  return { user: resolved };
}
