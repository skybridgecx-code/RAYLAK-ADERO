import "server-only";

import { and, count, desc, eq, ne } from "drizzle-orm";
import { db, aderoCancelPenalties, aderoQuotes, aderoRequests } from "@raylak/db";
import {
  ADERO_CANCEL_FEE_PERCENT_LATE,
  ADERO_CANCEL_FEE_PERCENT_VERY_LATE,
  ADERO_CANCEL_FEE_WINDOW_MINUTES,
  ADERO_CANCEL_FREE_WINDOW_MINUTES,
} from "@raylak/shared";
import {
  createCancelPenaltySchema,
  type CreateCancelPenaltyInput,
} from "@/lib/validators";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toDecimalString(value: number): string {
  return roundMoney(value).toFixed(2);
}

export async function calculateCancelPenalty(
  requestId: string,
  tripId: string | null,
  userId: string,
  role: "requester" | "operator",
): Promise<{ penaltyType: "none" | "fee"; penaltyAmount: number; currency: string }> {
  const [request] = await db
    .select({
      id: aderoRequests.id,
      pickupAt: aderoRequests.pickupAt,
    })
    .from(aderoRequests)
    .where(eq(aderoRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw new Error("Request not found.");
  }

  const now = Date.now();
  const minutesUntilPickup = Math.floor((request.pickupAt.getTime() - now) / 60000);

  let penaltyType: "none" | "fee" = "none";
  let penaltyPercent = 0;

  if (minutesUntilPickup < ADERO_CANCEL_FREE_WINDOW_MINUTES) {
    penaltyType = "fee";
    penaltyPercent =
      minutesUntilPickup < ADERO_CANCEL_FEE_WINDOW_MINUTES
        ? ADERO_CANCEL_FEE_PERCENT_VERY_LATE
        : ADERO_CANCEL_FEE_PERCENT_LATE;
  }

  const [quote] = await db
    .select({
      totalAmount: aderoQuotes.totalAmount,
      currency: aderoQuotes.currency,
    })
    .from(aderoQuotes)
    .where(eq(aderoQuotes.requestId, requestId))
    .orderBy(desc(aderoQuotes.createdAt))
    .limit(1);

  const quoteAmount = quote ? Number(quote.totalAmount) : 0;
  const penaltyAmount = penaltyType === "fee" ? roundMoney(quoteAmount * penaltyPercent) : 0;

  const currency = (quote?.currency ?? "USD").toUpperCase();

  if (role === "operator" && tripId === null) {
    return {
      penaltyType,
      penaltyAmount,
      currency,
    };
  }

  return {
    penaltyType,
    penaltyAmount,
    currency,
  };
}

export async function recordCancelPenalty(input: CreateCancelPenaltyInput) {
  const parsed = createCancelPenaltySchema.parse(input);

  const [row] = await db
    .insert(aderoCancelPenalties)
    .values({
      tripId: parsed.tripId ?? null,
      requestId: parsed.requestId,
      userId: parsed.userId,
      cancelledByRole: parsed.cancelledByRole,
      reason: parsed.reason ?? null,
      penaltyType: parsed.penaltyType ?? "none",
      penaltyAmount:
        parsed.penaltyAmount === undefined
          ? null
          : toDecimalString(parsed.penaltyAmount),
      currency: "USD",
      metadata: null,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to record cancel penalty.");
  }

  return row;
}

export async function waivePenalty(
  penaltyId: string,
  waivedByUserId: string,
  reason: string,
) {
  const [updated] = await db
    .update(aderoCancelPenalties)
    .set({
      waived: true,
      waivedByUserId,
      waivedReason: reason,
    })
    .where(eq(aderoCancelPenalties.id, penaltyId))
    .returning();

  if (!updated) {
    throw new Error("Penalty not found.");
  }

  return updated;
}

export async function getCancelPenaltiesForUser(userId: string) {
  return db
    .select()
    .from(aderoCancelPenalties)
    .where(eq(aderoCancelPenalties.userId, userId))
    .orderBy(desc(aderoCancelPenalties.createdAt));
}

export async function getUserCancellationCount(userId: string): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(aderoCancelPenalties)
    .where(
      and(
        eq(aderoCancelPenalties.userId, userId),
        ne(aderoCancelPenalties.penaltyType, "none"),
      ),
    );

  return Number(result?.value ?? 0);
}
