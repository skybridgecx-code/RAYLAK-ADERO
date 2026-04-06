import { eq } from "drizzle-orm";
import { db } from "@raylak/db";
import { users } from "@raylak/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  /**
   * Returns the DB record for the currently authenticated Clerk user.
   * Used to check whether the webhook has synced the user yet.
   */
  getSelf: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, ctx.userId!),
      columns: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
    return user ?? null;
  }),
});
