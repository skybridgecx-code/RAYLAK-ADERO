import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { aderoRequests, aderoTripStatusLog, aderoTrips, db } from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { notifyTripStatusChanged } from "@/lib/notifications";
import {
  isAderoTripStatus,
  validateTripTransition,
} from "@/lib/trip-lifecycle";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

const BodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const routeParams = await params;
    const parsedParams = ParamsSchema.safeParse(routeParams);
    if (parsedParams.success === false) {
      return apiError("Invalid trip id.", 400);
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

    const parsedBody = BodySchema.safeParse(body);
    if (parsedBody.success === false) {
      return apiError("Invalid trip cancel payload.", 400);
    }

    const [trip] = await db
      .select({
        id: aderoTrips.id,
        status: aderoTrips.status,
        operatorId: aderoTrips.operatorId,
        requesterId: aderoRequests.requesterId,
      })
      .from(aderoTrips)
      .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
      .where(eq(aderoTrips.id, parsedParams.data.id))
      .limit(1);

    if (trip === undefined) {
      return apiError("Trip not found.", 404);
    }

    if (user.role !== "admin" && trip.operatorId !== user.id) {
      return apiError("Forbidden", 403);
    }

    if (isAderoTripStatus(trip.status) === false) {
      return apiError(`Unknown trip status: ${trip.status}`, 400);
    }

    validateTripTransition(trip.status, "canceled");

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(aderoTrips)
        .set({
          status: "canceled",
          canceledAt: now,
          cancelReason: parsedBody.data.reason,
          updatedAt: now,
        })
        .where(eq(aderoTrips.id, trip.id));

      await tx.insert(aderoTripStatusLog).values({
        tripId: trip.id,
        fromStatus: trip.status,
        toStatus: "canceled",
        changedBy: user.id,
        note: parsedBody.data.reason,
        createdAt: now,
      });
    });

    try {
      await notifyTripStatusChanged(trip.requesterId, trip.id, "canceled");
    } catch (error) {
      console.error("[adero/api/v1/trips/cancel] notification failed:", error);
    }

    return apiSuccess({ tripId: trip.id, status: "canceled" });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    const message = getErrorMessage(error, "Failed to cancel trip.");
    if (
      message.includes("Illegal trip status transition")
      || message.includes("Trip is already in status")
      || message.includes("Unknown current trip status")
      || message.includes("Unknown new trip status")
    ) {
      return apiError(message, 400);
    }
    return apiError(message, 500);
  }
}
