import "server-only";

import { and, avg, count, desc, eq, or } from "drizzle-orm";
import { db, aderoCancelPenalties, aderoDisputes, aderoRatings, aderoRequests, aderoTrips, aderoTrustScores } from "@raylak/db";
import {
  ADERO_TRUST_DISPATCH_MINIMUM,
  ADERO_TRUST_MIN_TRIPS_FOR_TIER,
  ADERO_TRUST_SCORE_WEIGHTS,
  ADERO_TRUST_TIER_THRESHOLDS,
} from "@raylak/shared";

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function toDecimalString(value: number, decimals = 2): string {
  return round(value, decimals).toFixed(decimals);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveTier(overallScore: number, totalTrips: number): "new" | "standard" | "trusted" | "preferred" | "suspended" {
  if (totalTrips < ADERO_TRUST_MIN_TRIPS_FOR_TIER) {
    return "new";
  }

  if (overallScore < ADERO_TRUST_DISPATCH_MINIMUM) {
    return "suspended";
  }

  if (overallScore >= ADERO_TRUST_TIER_THRESHOLDS.preferred.min) {
    return "preferred";
  }

  if (overallScore >= ADERO_TRUST_TIER_THRESHOLDS.trusted.min) {
    return "trusted";
  }

  if (overallScore >= ADERO_TRUST_TIER_THRESHOLDS.standard.min) {
    return "standard";
  }

  return "new";
}

export async function recalculateTrustScore(userId: string) {
  const [ratingRows, tripRows, cancellationRows, disputeRows] = await Promise.all([
    db
      .select({
        ratingAverage: avg(aderoRatings.overallScore),
        totalRatings: count(aderoRatings.id),
      })
      .from(aderoRatings)
      .where(and(eq(aderoRatings.rateeUserId, userId), eq(aderoRatings.isVisible, true))),
    db
      .select({
        totalTrips: count(aderoTrips.id),
      })
      .from(aderoTrips)
      .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
      .where(
        and(
          eq(aderoTrips.status, "completed"),
          or(eq(aderoTrips.operatorId, userId), eq(aderoRequests.requesterId, userId)),
        ),
      ),
    db
      .select({ totalCancellations: count(aderoCancelPenalties.id) })
      .from(aderoCancelPenalties)
      .where(and(eq(aderoCancelPenalties.userId, userId), eq(aderoCancelPenalties.waived, false))),
    db
      .select({ totalDisputes: count(aderoDisputes.id) })
      .from(aderoDisputes)
      .where(eq(aderoDisputes.filedAgainstUserId, userId)),
  ]);

  const ratingResult = ratingRows[0];
  const tripResult = tripRows[0];
  const cancellationResult = cancellationRows[0];
  const disputeResult = disputeRows[0];

  const totalRatings = Number(ratingResult?.totalRatings ?? 0);
  const ratingAverage = ratingResult?.ratingAverage
    ? round(Number(ratingResult.ratingAverage), 2)
    : 0;
  const totalTrips = Number(tripResult?.totalTrips ?? 0);
  const totalCancellations = Number(cancellationResult?.totalCancellations ?? 0);
  const totalDisputes = Number(disputeResult?.totalDisputes ?? 0);

  const denominator = Math.max(1, totalTrips + totalCancellations);
  const completionRate = clamp(round((totalTrips / denominator) * 100, 2), 0, 100);
  const cancellationRate = clamp(round((totalCancellations / denominator) * 100, 2), 0, 100);
  const disputeRate = clamp(round((totalDisputes / Math.max(1, totalTrips)) * 100, 2), 0, 100);
  const incidentCount = 0;
  const onTimeRate = completionRate;

  const ratingScoreNormalized = clamp(round((ratingAverage / 5) * 100, 2), 0, 100);

  const overallScore = clamp(
    round(
      ratingScoreNormalized * ADERO_TRUST_SCORE_WEIGHTS.ratingAverage
        + completionRate * ADERO_TRUST_SCORE_WEIGHTS.completionRate
        + onTimeRate * ADERO_TRUST_SCORE_WEIGHTS.onTimeRate
        + (100 - cancellationRate) * ADERO_TRUST_SCORE_WEIGHTS.cancellationRate
        + (100 - disputeRate) * ADERO_TRUST_SCORE_WEIGHTS.disputeRate,
      2,
    ),
    0,
    100,
  );

  const tier = resolveTier(overallScore, totalTrips);
  const now = new Date();

  const [score] = await db
    .insert(aderoTrustScores)
    .values({
      userId,
      overallScore: toDecimalString(overallScore),
      ratingAverage: toDecimalString(ratingAverage),
      totalRatings,
      completionRate: toDecimalString(completionRate),
      cancellationRate: toDecimalString(cancellationRate),
      disputeRate: toDecimalString(disputeRate),
      incidentCount,
      onTimeRate: toDecimalString(onTimeRate),
      totalTrips,
      totalCancellations,
      totalDisputes,
      tier,
      lastCalculatedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aderoTrustScores.userId,
      set: {
        overallScore: toDecimalString(overallScore),
        ratingAverage: toDecimalString(ratingAverage),
        totalRatings,
        completionRate: toDecimalString(completionRate),
        cancellationRate: toDecimalString(cancellationRate),
        disputeRate: toDecimalString(disputeRate),
        incidentCount,
        onTimeRate: toDecimalString(onTimeRate),
        totalTrips,
        totalCancellations,
        totalDisputes,
        tier,
        lastCalculatedAt: now,
        updatedAt: now,
      },
    })
    .returning();

  if (!score) {
    throw new Error("Failed to recalculate trust score.");
  }

  return score;
}

export async function getTrustScore(userId: string) {
  const [row] = await db
    .select()
    .from(aderoTrustScores)
    .where(eq(aderoTrustScores.userId, userId))
    .limit(1);

  return row ?? null;
}

export async function getTrustScoresByTier(tier: string) {
  return db
    .select()
    .from(aderoTrustScores)
    .where(eq(aderoTrustScores.tier, tier as never))
    .orderBy(desc(aderoTrustScores.overallScore));
}
