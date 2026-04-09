import { and, desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  aderoRequestOffers,
  aderoRequests,
  aderoTrips,
  db,
} from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import {
  calculateCancelPenalty,
  recordCancelPenalty,
} from "@/lib/cancel-policy";
import { createNotification } from "@/lib/notifications";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

const BodySchema = z.object({
  reason: z.string().trim().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const routeParams = await params;
    const parsedParams = ParamsSchema.safeParse(routeParams);
    if (parsedParams.success === false) {
      return apiError("Invalid request id.", 400);
    }

    const { user } = await authenticateRequest();

    if (
      user.role !== "requester"
      && user.role !== "company"
      && user.role !== "admin"
    ) {
      return apiError("Forbidden", 403);
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsedBody = BodySchema.safeParse(body);
    if (parsedBody.success === false) {
      return apiError("Invalid cancellation payload.", 400);
    }

    const requestId = parsedParams.data.id;
    const now = new Date();

    const [requestRows, tripRows] = await Promise.all([
      db
        .select({
          id: aderoRequests.id,
          requesterId: aderoRequests.requesterId,
          status: aderoRequests.status,
        })
        .from(aderoRequests)
        .where(eq(aderoRequests.id, requestId))
        .limit(1),
      db
        .select({ id: aderoTrips.id })
        .from(aderoTrips)
        .where(eq(aderoTrips.requestId, requestId))
        .orderBy(desc(aderoTrips.createdAt))
        .limit(1),
    ]);

    const requestRow = requestRows[0];
    const tripRow = tripRows[0] ?? null;

    if (requestRow === undefined) {
      return apiError("Request not found.", 404);
    }

    if (user.role !== "admin" && requestRow.requesterId !== user.id) {
      return apiError("Forbidden", 403);
    }

    if (requestRow.status !== "submitted" && requestRow.status !== "matched") {
      return apiError("This request cannot be canceled.", 400);
    }

    const penalty = await calculateCancelPenalty(
      requestRow.id,
      tripRow?.id ?? null,
      requestRow.requesterId,
      "requester",
    );

    const pendingOffers = await db
      .select({
        id: aderoRequestOffers.id,
        operatorId: aderoRequestOffers.operatorId,
      })
      .from(aderoRequestOffers)
      .where(
        and(
          eq(aderoRequestOffers.requestId, requestRow.id),
          eq(aderoRequestOffers.status, "pending"),
        ),
      );

    const [updated] = await db
      .update(aderoRequests)
      .set({
        status: "canceled",
        updatedAt: now,
      })
      .where(
        and(
          eq(aderoRequests.id, requestRow.id),
          eq(aderoRequests.status, requestRow.status),
        ),
      )
      .returning({ id: aderoRequests.id });

    if (updated === undefined) {
      return apiError("Request status changed before cancellation.", 409);
    }

    await db
      .update(aderoRequestOffers)
      .set({
        status: "expired",
        respondedAt: now,
      })
      .where(
        and(
          eq(aderoRequestOffers.requestId, requestRow.id),
          eq(aderoRequestOffers.status, "pending"),
        ),
      );

    await recordCancelPenalty({
      tripId: tripRow?.id ?? undefined,
      requestId: requestRow.id,
      userId: requestRow.requesterId,
      cancelledByRole: "requester",
      reason: parsedBody.data.reason,
      penaltyType: penalty.penaltyType,
      penaltyAmount: penalty.penaltyAmount,
    });

    await createNotification(
      requestRow.requesterId,
      "trip_canceled",
      "Request canceled",
      penalty.penaltyAmount > 0
        ? `Your request was canceled. Fee: ${penalty.currency.toUpperCase()} $${penalty.penaltyAmount.toFixed(2)}.`
        : "Your request was canceled.",
      {
        requestId: requestRow.id,
        penaltyType: penalty.penaltyType,
        penaltyAmount: penalty.penaltyAmount,
      },
    );

    await Promise.allSettled(
      pendingOffers.map((offer) =>
        createNotification(
          offer.operatorId,
          "offer_declined",
          "Offer expired",
          "The request was canceled before acceptance.",
          {
            requestId: requestRow.id,
            offerId: offer.id,
          },
        ),
      ),
    );

    return apiSuccess({
      requestId: requestRow.id,
      canceled: true,
      penalty,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to cancel request."), 500);
  }
}
