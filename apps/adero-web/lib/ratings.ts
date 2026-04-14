import "server-only";

import { and, avg, count, desc, eq } from "drizzle-orm";
import {
  db,
  aderoRatings,
  aderoTrips,
  aderoRequests,
} from "@raylak/db";
import type { CreateRatingInput } from "@/lib/validators";
import { createRatingSchema } from "@/lib/validators";
import { createNotification } from "@/lib/notifications";

export async function createRating(
  raterUserId: string,
  input: CreateRatingInput,
) {
  const parsed = createRatingSchema.parse(input);

  const [trip] = await db
    .select({
      id: aderoTrips.id,
      status: aderoTrips.status,
      operatorId: aderoTrips.operatorId,
      requestId: aderoTrips.requestId,
      requesterId: aderoRequests.requesterId,
    })
    .from(aderoTrips)
    .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
    .where(eq(aderoTrips.id, parsed.tripId))
    .limit(1);

  if (!trip) {
    throw new Error("Trip not found.");
  }

  if (trip.status !== "completed") {
    throw new Error("Ratings can only be submitted for completed trips.");
  }

  if (parsed.raterRole === "requester" && raterUserId !== trip.requesterId) {
    throw new Error("You are not the requester for this trip.");
  }

  if (parsed.raterRole === "operator" && raterUserId !== trip.operatorId) {
    throw new Error("You are not the operator for this trip.");
  }

  if (raterUserId === parsed.rateeUserId) {
    throw new Error("You cannot rate yourself.");
  }

  const [existing] = await db
    .select({ id: aderoRatings.id })
    .from(aderoRatings)
    .where(
      and(
        eq(aderoRatings.tripId, parsed.tripId),
        eq(aderoRatings.raterUserId, raterUserId),
      ),
    )
    .limit(1);

  if (existing) {
    throw new Error("You have already submitted a rating for this trip.");
  }

  const [rating] = await db
    .insert(aderoRatings)
    .values({
      tripId: parsed.tripId,
      requestId: trip.requestId,
      raterUserId,
      rateeUserId: parsed.rateeUserId,
      raterRole: parsed.raterRole,
      overallScore: parsed.overallScore,
      punctualityScore: parsed.punctualityScore ?? null,
      professionalismScore: parsed.professionalismScore ?? null,
      vehicleConditionScore: parsed.vehicleConditionScore ?? null,
      communicationScore: parsed.communicationScore ?? null,
      comment: parsed.comment ?? null,
    })
    .returning();

  if (!rating) {
    throw new Error("Failed to create rating.");
  }

  try {
    await createNotification(
      parsed.rateeUserId,
      "rating_received" as never,
      "New rating received",
      `You received a ${parsed.overallScore}-star rating for trip #${trip.id.slice(0, 8)}.`,
      {
        ratingId: rating.id,
        tripId: trip.id,
        overallScore: parsed.overallScore,
      },
    );
  } catch (err) {
    console.error("[adero] rating notification failed:", err);
  }

  return rating;
}

export async function getRatingsForTrip(tripId: string) {
  return db
    .select()
    .from(aderoRatings)
    .where(eq(aderoRatings.tripId, tripId))
    .orderBy(desc(aderoRatings.createdAt));
}

export async function getRatingsForUser(userId: string) {
  return db
    .select()
    .from(aderoRatings)
    .where(eq(aderoRatings.rateeUserId, userId))
    .orderBy(desc(aderoRatings.createdAt));
}

export async function hasUserRatedTrip(
  tripId: string,
  userId: string,
): Promise<boolean> {
  const [existing] = await db
    .select({ id: aderoRatings.id })
    .from(aderoRatings)
    .where(
      and(
        eq(aderoRatings.tripId, tripId),
        eq(aderoRatings.raterUserId, userId),
      ),
    )
    .limit(1);
  return Boolean(existing);
}

export async function getUserRatingAverage(
  userId: string,
): Promise<{ average: number; total: number }> {
  const [result] = await db
    .select({
      average: avg(aderoRatings.overallScore),
      total: count(aderoRatings.id),
    })
    .from(aderoRatings)
    .where(
      and(
        eq(aderoRatings.rateeUserId, userId),
        eq(aderoRatings.isVisible, true),
      ),
    );

  return {
    average: result?.average ? parseFloat(String(result.average)) : 0,
    total: result?.total ?? 0,
  };
}
