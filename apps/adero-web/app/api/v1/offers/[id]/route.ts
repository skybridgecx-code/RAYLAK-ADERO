import { and, count, eq, inArray, ne } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  aderoRequestOffers,
  aderoRequests,
  aderoTripStatusLog,
  aderoTrips,
  db,
} from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import {
  notifyRequestAccepted,
  resolveOperatorDisplayName,
} from "@/lib/notifications";
import { getQueueStatusForPendingOffers } from "@/lib/request-status-sync";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

const OfferActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const routeParams = await params;
    const parsedParams = ParamsSchema.safeParse(routeParams);
    if (parsedParams.success === false) {
      return apiError("Invalid offer id.", 400);
    }

    const { user } = await authenticateRequest();
    if (user.role !== "operator" && user.role !== "admin") {
      return apiError("Forbidden", 403);
    }

    const [offer] = await db
      .select({
        offer: aderoRequestOffers,
        request: aderoRequests,
      })
      .from(aderoRequestOffers)
      .innerJoin(aderoRequests, eq(aderoRequestOffers.requestId, aderoRequests.id))
      .where(eq(aderoRequestOffers.id, parsedParams.data.id))
      .limit(1);

    if (offer === undefined) {
      return apiError("Offer not found.", 404);
    }

    if (user.role !== "admin" && offer.offer.operatorId !== user.id) {
      return apiError("Forbidden", 403);
    }

    return apiSuccess(offer);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load offer."), 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const routeParams = await params;
    const parsedParams = ParamsSchema.safeParse(routeParams);
    if (parsedParams.success === false) {
      return apiError("Invalid offer id.", 400);
    }

    const { user } = await authenticateRequest();
    if (user.role !== "operator" && user.role !== "admin") {
      return apiError("Forbidden", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const parsedBody = OfferActionSchema.safeParse(body);
    if (parsedBody.success === false) {
      return apiError("Invalid offer action.", 400);
    }

    const now = new Date();
    const offerId = parsedParams.data.id;

    if (parsedBody.data.action === "decline") {
      const [offer] = await db
        .select({
          id: aderoRequestOffers.id,
          requestId: aderoRequestOffers.requestId,
          operatorId: aderoRequestOffers.operatorId,
          status: aderoRequestOffers.status,
          requestStatus: aderoRequests.status,
        })
        .from(aderoRequestOffers)
        .innerJoin(aderoRequests, eq(aderoRequestOffers.requestId, aderoRequests.id))
        .where(eq(aderoRequestOffers.id, offerId))
        .limit(1);

      if (offer === undefined) {
        return apiError("Offer not found.", 404);
      }

      if (user.role !== "admin" && offer.operatorId !== user.id) {
        return apiError("Forbidden", 403);
      }

      if (offer.status !== "pending") {
        return apiError(`Offer is already ${offer.status}.`, 400);
      }

      const [updated] = await db.transaction(async (tx) => {
        const [declinedOffer] = await tx
          .update(aderoRequestOffers)
          .set({
            status: "declined",
            respondedAt: now,
          })
          .where(
            and(
              eq(aderoRequestOffers.id, offer.id),
              eq(aderoRequestOffers.status, "pending"),
            ),
          )
          .returning();

        if (declinedOffer === undefined) {
          return [undefined];
        }

        const [pendingCounts] = await tx
          .select({ pendingCount: count() })
          .from(aderoRequestOffers)
          .where(
            and(
              eq(aderoRequestOffers.requestId, offer.requestId),
              eq(aderoRequestOffers.status, "pending"),
            ),
          );

        const nextRequestStatus = getQueueStatusForPendingOffers(
          offer.requestStatus,
          pendingCounts?.pendingCount ?? 0,
        );

        if (nextRequestStatus && nextRequestStatus !== offer.requestStatus) {
          await tx
            .update(aderoRequests)
            .set({
              status: nextRequestStatus,
              updatedAt: now,
            })
            .where(eq(aderoRequests.id, offer.requestId));
        }

        return [declinedOffer];
      });

      if (updated === undefined) {
        return apiError("Offer is no longer pending.", 409);
      }

      return apiSuccess({ offer: updated, action: "decline" });
    }

    let tripId: string | null = null;
    let requestId: string | null = null;
    let requesterId: string | null = null;
    let operatorId: string | null = null;

    await db.transaction(async (tx) => {
      const [offer] = await tx
        .select({
          id: aderoRequestOffers.id,
          requestId: aderoRequestOffers.requestId,
          operatorId: aderoRequestOffers.operatorId,
          offerStatus: aderoRequestOffers.status,
          requesterId: aderoRequests.requesterId,
          requestStatus: aderoRequests.status,
          pickupAddress: aderoRequests.pickupAddress,
          dropoffAddress: aderoRequests.dropoffAddress,
          pickupAt: aderoRequests.pickupAt,
        })
        .from(aderoRequestOffers)
        .innerJoin(aderoRequests, eq(aderoRequestOffers.requestId, aderoRequests.id))
        .where(eq(aderoRequestOffers.id, offerId))
        .limit(1);

      if (offer === undefined) {
        throw new Error("Offer not found.");
      }

      if (user.role !== "admin" && offer.operatorId !== user.id) {
        throw new Error("Forbidden");
      }

      if (offer.offerStatus !== "pending") {
        throw new Error(`Offer is already ${offer.offerStatus}.`);
      }

      const [existingTrip] = await tx
        .select({ id: aderoTrips.id })
        .from(aderoTrips)
        .where(eq(aderoTrips.requestId, offer.requestId))
        .limit(1);

      if (existingTrip !== undefined) {
        throw new Error("A trip already exists for this request.");
      }

      const [acceptedOffer] = await tx
        .update(aderoRequestOffers)
        .set({
          status: "accepted",
          respondedAt: now,
        })
        .where(
          and(
            eq(aderoRequestOffers.id, offer.id),
            eq(aderoRequestOffers.status, "pending"),
          ),
        )
        .returning({ id: aderoRequestOffers.id });

      if (acceptedOffer === undefined) {
        throw new Error("Offer is no longer pending.");
      }

      const [updatedRequest] = await tx
        .update(aderoRequests)
        .set({
          status: "accepted",
          updatedAt: now,
        })
        .where(
          and(
            eq(aderoRequests.id, offer.requestId),
            inArray(aderoRequests.status, ["submitted", "matched"]),
          ),
        )
        .returning({ id: aderoRequests.id });

      if (updatedRequest === undefined) {
        throw new Error("Request is no longer available for acceptance.");
      }

      await tx
        .update(aderoRequestOffers)
        .set({
          status: "expired",
          respondedAt: now,
        })
        .where(
          and(
            eq(aderoRequestOffers.requestId, offer.requestId),
            eq(aderoRequestOffers.status, "pending"),
            ne(aderoRequestOffers.id, offer.id),
          ),
        );

      const [trip] = await tx
        .insert(aderoTrips)
        .values({
          requestId: offer.requestId,
          operatorId: offer.operatorId,
          status: "assigned",
          pickupAddress: offer.pickupAddress,
          dropoffAddress: offer.dropoffAddress,
          scheduledAt: offer.pickupAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: aderoTrips.id });

      if (trip === undefined) {
        throw new Error("Trip could not be created.");
      }

      await tx.insert(aderoTripStatusLog).values({
        tripId: trip.id,
        fromStatus: "assigned",
        toStatus: "assigned",
        changedBy: user.id,
        note: "Trip created from accepted offer.",
        createdAt: now,
      });

      tripId = trip.id;
      requestId = offer.requestId;
      requesterId = offer.requesterId;
      operatorId = offer.operatorId;
    });

    if (
      requesterId !== null
      && requestId !== null
      && operatorId !== null
    ) {
      try {
        const operatorName = await resolveOperatorDisplayName(operatorId);
        await notifyRequestAccepted(requesterId, requestId, operatorName);
      } catch (error) {
        console.error("[adero/api/v1/offers] request accepted notification failed:", error);
      }
    }

    return apiSuccess({
      action: "accept",
      tripId,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    const message = getErrorMessage(error, "Failed to update offer.");
    if (message === "Forbidden") {
      return apiError("Forbidden", 403);
    }
    if (message === "Offer not found.") {
      return apiError(message, 404);
    }
    if (
      message.includes("already")
      || message.includes("no longer")
      || message.includes("exists")
    ) {
      return apiError(message, 400);
    }
    return apiError(message, 500);
  }
}
