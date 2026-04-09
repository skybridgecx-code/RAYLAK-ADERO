import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { aderoRequests, aderoTrips, db } from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { createRating, getRatingsForTrip } from "@/lib/ratings";
import { createRatingSchema } from "@/lib/validators";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

async function getTripAccess(
  tripId: string,
  userId: string,
  role: string,
): Promise<boolean> {
  const [trip] = await db
    .select({
      operatorId: aderoTrips.operatorId,
      requesterId: aderoRequests.requesterId,
    })
    .from(aderoTrips)
    .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
    .where(eq(aderoTrips.id, tripId))
    .limit(1);

  if (trip === undefined) {
    return false;
  }

  if (role === "admin") {
    return true;
  }

  return trip.operatorId === userId || trip.requesterId === userId;
}

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
    const allowed = await getTripAccess(parsedParams.data.id, user.id, user.role);
    if (allowed === false) {
      return apiError("Forbidden", 403);
    }

    const ratings = await getRatingsForTrip(parsedParams.data.id);
    return apiSuccess(ratings);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load trip ratings."), 500);
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
      return apiError("Invalid trip id.", 400);
    }

    const { user } = await authenticateRequest();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const payload =
      typeof body === "object" && body !== null
        ? { ...(body as Record<string, unknown>), tripId: parsedParams.data.id }
        : { tripId: parsedParams.data.id };

    const parsedBody = createRatingSchema.safeParse(payload);
    if (parsedBody.success === false) {
      return apiError("Invalid rating payload.", 400);
    }

    const rating = await createRating(user.id, parsedBody.data);
    return apiSuccess(rating, 201);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    const message = getErrorMessage(error, "Failed to submit rating.");
    if (
      message.includes("not found")
      || message.includes("cannot")
      || message.includes("already")
      || message.includes("not the")
    ) {
      return apiError(message, 400);
    }
    return apiError(message, 500);
  }
}
