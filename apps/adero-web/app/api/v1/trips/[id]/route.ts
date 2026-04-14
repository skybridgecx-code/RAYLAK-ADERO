import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { aderoRequests, aderoTripStatusLog, aderoTrips, db } from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { getLatestEta } from "@/lib/eta";
import { getLatestLocation } from "@/lib/tracking";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const routeParams = await params;
    const parsedParams = ParamsSchema.safeParse(routeParams);
    if (parsedParams.success === false) {
      return apiError("Invalid trip id.", 400);
    }

    const { user } = await authenticateRequest();
    const tripId = parsedParams.data.id;

    const [trip] = await db
      .select({
        trip: aderoTrips,
        requesterId: aderoRequests.requesterId,
      })
      .from(aderoTrips)
      .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
      .where(eq(aderoTrips.id, tripId))
      .limit(1);

    if (trip === undefined) {
      return apiError("Trip not found.", 404);
    }

    const canView =
      user.role === "admin"
      || trip.trip.operatorId === user.id
      || trip.requesterId === user.id;

    if (canView === false) {
      return apiError("Forbidden", 403);
    }

    const [location, eta, statusLog] = await Promise.all([
      getLatestLocation(tripId),
      getLatestEta(tripId),
      db
        .select()
        .from(aderoTripStatusLog)
        .where(eq(aderoTripStatusLog.tripId, tripId))
        .orderBy(desc(aderoTripStatusLog.createdAt)),
    ]);

    return apiSuccess({
      trip: trip.trip,
      location,
      eta,
      statusLog,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load trip detail."), 500);
  }
}
