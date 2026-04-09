import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { aderoRequests, aderoTrips, db } from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

export async function GET(_request: NextRequest) {
  try {
    const { user } = await authenticateRequest();

    if (user.role === "operator") {
      const trips = await db
        .select()
        .from(aderoTrips)
        .where(eq(aderoTrips.operatorId, user.id))
        .orderBy(desc(aderoTrips.createdAt));
      return apiSuccess(trips);
    }

    if (user.role === "requester" || user.role === "company") {
      const trips = await db
        .select({
          trip: aderoTrips,
          request: aderoRequests,
        })
        .from(aderoTrips)
        .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
        .where(eq(aderoRequests.requesterId, user.id))
        .orderBy(desc(aderoTrips.createdAt));
      return apiSuccess(trips);
    }

    const allTrips = await db
      .select()
      .from(aderoTrips)
      .orderBy(desc(aderoTrips.createdAt));

    return apiSuccess(allTrips);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load trips."), 500);
  }
}
