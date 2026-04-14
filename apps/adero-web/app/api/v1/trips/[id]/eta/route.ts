import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { aderoRequests, aderoTrips, db } from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { getLatestEta } from "@/lib/eta";
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
    const [trip] = await db
      .select({
        id: aderoTrips.id,
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

    const canView =
      user.role === "admin"
      || trip.operatorId === user.id
      || trip.requesterId === user.id;

    if (canView === false) {
      return apiError("Forbidden", 403);
    }

    const eta = await getLatestEta(parsedParams.data.id);
    return apiSuccess(eta);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load ETA."), 500);
  }
}
