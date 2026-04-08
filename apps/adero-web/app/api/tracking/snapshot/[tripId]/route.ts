import { desc, eq } from "drizzle-orm";
import { aderoGeofenceEvents, aderoTripLocations, aderoTrips, db } from "@raylak/db";
import {
  STALE_LOCATION_THRESHOLD_MS,
  getActiveTrackingSession,
  getLatestLocation,
} from "@/lib/tracking";
import { getLatestEta } from "@/lib/eta";
import {
  getAuthenticatedAderoUser,
  getAuthorizedTripForUser,
  toNumber,
} from "../../_helpers";

function jsonResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;

  try {
    const user = await getAuthenticatedAderoUser();
    await getAuthorizedTripForUser(tripId, user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    if (message === "Unauthenticated") return jsonResponse(401, "Unauthenticated.");
    if (message === "Trip not found") return jsonResponse(404, "Trip not found.");
    if (message === "Forbidden") return jsonResponse(403, "Forbidden.");
    return jsonResponse(500, "Authorization failed.");
  }

  const [location, eta, session, tripRow, geofenceEvents, recentLocations] =
    await Promise.all([
      getLatestLocation(tripId),
      getLatestEta(tripId),
      getActiveTrackingSession(tripId),
      db
        .select({
          status: aderoTrips.status,
        })
        .from(aderoTrips)
        .where(eq(aderoTrips.id, tripId))
        .limit(1),
      db
        .select()
        .from(aderoGeofenceEvents)
        .where(eq(aderoGeofenceEvents.tripId, tripId))
        .orderBy(desc(aderoGeofenceEvents.triggeredAt))
        .limit(5),
      db
        .select()
        .from(aderoTripLocations)
        .where(eq(aderoTripLocations.tripId, tripId))
        .orderBy(desc(aderoTripLocations.recordedAt))
        .limit(50),
    ]);

  const isStale = !location
    || Date.now() - location.recordedAt.getTime() > STALE_LOCATION_THRESHOLD_MS;

  return Response.json({
    tripId,
    tripStatus: tripRow[0]?.status ?? null,
    location: location
      ? {
          id: location.id,
          latitude: toNumber(location.latitude),
          longitude: toNumber(location.longitude),
          heading: location.heading === null ? null : toNumber(location.heading),
          speed: location.speed === null ? null : toNumber(location.speed),
          accuracy: location.accuracy === null ? null : toNumber(location.accuracy),
          source: location.source,
          recordedAt: location.recordedAt,
        }
      : null,
    eta: eta
      ? {
          id: eta.id,
          status: eta.status,
          estimatedArrivalAt: eta.estimatedArrivalAt,
          estimatedDurationMinutes: eta.estimatedDurationMinutes,
          estimatedDistanceMiles:
            eta.estimatedDistanceMiles === null ? null : toNumber(eta.estimatedDistanceMiles),
          distanceRemainingMiles:
            eta.distanceRemainingMiles === null ? null : toNumber(eta.distanceRemainingMiles),
          destinationType: eta.destinationType,
          currentLatitude: eta.currentLatitude === null ? null : toNumber(eta.currentLatitude),
          currentLongitude: eta.currentLongitude === null ? null : toNumber(eta.currentLongitude),
          destinationLatitude:
            eta.destinationLatitude === null ? null : toNumber(eta.destinationLatitude),
          destinationLongitude:
            eta.destinationLongitude === null ? null : toNumber(eta.destinationLongitude),
        }
      : null,
    session: session
      ? {
          id: session.id,
          isActive: true,
          locationCount: session.locationCount,
          totalDistanceMiles: toNumber(session.totalDistanceMiles),
          startedAt: session.startedAt,
        }
      : null,
    geofenceEvents: geofenceEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      latitude: toNumber(event.latitude),
      longitude: toNumber(event.longitude),
      radiusMeters: toNumber(event.radiusMeters),
      triggeredAt: event.triggeredAt,
    })),
    locationHistory: recentLocations
      .reverse()
      .map((point) => ({
        id: point.id,
        latitude: toNumber(point.latitude),
        longitude: toNumber(point.longitude),
        recordedAt: point.recordedAt,
        heading: point.heading === null ? null : toNumber(point.heading),
        speed: point.speed === null ? null : toNumber(point.speed),
        accuracy: point.accuracy === null ? null : toNumber(point.accuracy),
      })),
    isStale,
    timestamp: new Date().toISOString(),
  });
}
