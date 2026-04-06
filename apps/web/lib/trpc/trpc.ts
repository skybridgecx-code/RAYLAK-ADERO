import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { UserRole } from "@raylak/shared/enums";

/**
 * Context created per-request.
 * Populated by createTRPCContext in server.ts.
 */
export interface TRPCContext {
  userId: string | null;
  role: UserRole | null;
}

export async function createTRPCContext(): Promise<TRPCContext> {
  const session = await auth();
  const role =
    (session.sessionClaims?.["publicMetadata"] as { role?: UserRole } | undefined)?.role ?? null;

  return {
    userId: session.userId,
    role,
  };
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ─── Routers & Procedures ─────────────────────────────────────────────────────

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/** Public — no auth required */
export const publicProcedure = t.procedure;

/** Requires authenticated user */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

/** Requires dispatcher or admin role */
export const dispatcherProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed: UserRole[] = ["dispatcher", "admin", "owner"];
  if (!ctx.role || !allowed.includes(ctx.role)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

/** Requires admin role */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed: UserRole[] = ["admin", "owner"];
  if (!ctx.role || !allowed.includes(ctx.role)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
