import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { aderoRequests, aderoTrips, db } from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import {
  getActiveTrackingSession,
  getTripLocationHistory,
  recordLocation,
  startTrackingSession,
} from "@/lib/tracking";
import { locationUpdateSchema } from "@/lib/validators";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

const LocationBodySchema = locationUpdateSchema.omit({ recordedAt: true });

async function getTripAccess(tripId: string, userId: string, role: string) {
  const [trip] = await db
    .select({
      id: aderoTrips.id,
      operatorId: aderoTrips.operatorId,
      requesterId: aderoRequests.requesterId,
    })
    .from(aderoTrips)
    .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
    .where(eq(aderoTrips.id, tripId))
    .limit(1);

  if (trip === undefined) {
    return { trip: null, exists: false as const };
  }

  if (role === "admin") {
    return { trip, exists: true as const };
  }

  if (trip.operatorId === userId || trip.requesterId === userId) {
    return { trip, exists: true as const };
  }

  return { trip: null, exists: true as const };
}

export async function GET(
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
    const access = await getTripAccess(parsedParams.data.id, user.id, user.role);
    if (access.exists === false) {
      return apiError("Trip not found.", 404);
    }

    if (access.trip === null) {
      return apiError("Forbidden", 403);
    }

    const limitRaw = request.nextUrl.searchParams.get("limit");
    const limitParsed = limitRaw ? Number(limitRaw) : undefined;
    const limit =
      typeof limitParsed === "number" && Number.isFinite(limitParsed)
        ? Math.max(1, Math.min(500, Math.floor(limitParsed)))
        : undefined;

    const history = await getTripLocationHistory(access.trip.id, limit);
    return apiSuccess(history);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load trip locations."), 500);
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
    if (user.role !== "operator" && user.role !== "admin") {
      return apiError("Forbidden", 403);
    }

    const [trip] = await db
      .select({
        id: aderoTrips.id,
        operatorId: aderoTrips.operatorId,
      })
      .from(aderoTrips)
      .where(eq(aderoTrips.id, parsedParams.data.id))
      .limit(1);

    if (trip === undefined) {
      return apiError("Trip not found.", 404);
    }

    if (user.role !== "admin" && trip.operatorId !== user.id) {
      return apiError("Forbidden", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const parsedBody = LocationBodySchema.safeParse(body);
    if (parsedBody.success === false) {
      return apiError("Invalid location payload.", 400);
    }

    const session =
      (await getActiveTrackingSession(trip.id))
      ?? (await startTrackingSession(trip.id, trip.operatorId));

    const locationUpdate: {
      latitude: number;
      longitude: number;
      recordedAt: Date;
      altitude?: number | null;
      heading?: number | null;
      speed?: number | null;
      accuracy?: number | null;
      source?: "gps" | "manual" | "network" | "fused";
    } = {
      latitude: parsedBody.data.latitude,
      longitude: parsedBody.data.longitude,
      source: parsedBody.data.source ?? "gps",
      recordedAt: new Date(),
    };

    if (parsedBody.data.altitude !== undefined) {
      locationUpdate.altitude = parsedBody.data.altitude;
    }
    if (parsedBody.data.heading !== undefined) {
      locationUpdate.heading = parsedBody.data.heading;
    }
    if (parsedBody.data.speed !== undefined) {
      locationUpdate.speed = parsedBody.data.speed;
    }
    if (parsedBody.data.accuracy !== undefined) {
      locationUpdate.accuracy = parsedBody.data.accuracy;
    }

    const result = await recordLocation(session.id, locationUpdate);

    if (result.recorded === false) {
      return apiError(result.reason ?? "Location not recorded.", 400);
    }

    return apiSuccess(result, 201);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    const message = getErrorMessage(error, "Failed to record trip location.");
    if (message.includes("not found")) {
      return apiError(message, 404);
    }
    if (message.includes("Forbidden")) {
      return apiError(message, 403);
    }
    return apiError(message, 500);
  }
}
