import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import {
  aderoOperatorLastLocations,
  aderoTrackingSessions,
  aderoTripLocations,
  aderoTrips,
  db,
} from "@raylak/db";
import { updateEtaOnLocationChange } from "./eta";
import { calculateDistanceBetweenPoints } from "./geo-utils";
export { MILES_PER_METER, calculateDistanceBetweenPoints } from "./geo-utils";

export const MIN_LOCATION_INTERVAL_MS = 3000;
export const MAX_LOCATION_AGE_MS = 30000;
export const STALE_LOCATION_THRESHOLD_MS = 120000;

const FUTURE_TOLERANCE_MS = 5000;

type LocationSource = "gps" | "manual" | "network" | "fused";

export type LocationUpdate = {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  source?: LocationSource;
  recordedAt: Date;
};

export type TrackingState = {
  tripId: string;
  operatorUserId: string;
  sessionId: string;
  isActive: boolean;
  lastLocation: { latitude: number; longitude: number; recordedAt: Date } | null;
  locationCount: number;
  totalDistanceMiles: number;
};

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function toNumber(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toCoordinate(value: number): string {
  return round(value, 7).toFixed(7);
}

function toDecimal(value: number, decimals = 2): string {
  return round(value, decimals).toFixed(decimals);
}

function toNullableDecimal(
  value: number | null | undefined,
  decimals = 2,
): string | null {
  if (value === null || value === undefined) return null;
  return toDecimal(value, decimals);
}

export function validateLocationUpdate(
  update: LocationUpdate,
): { valid: boolean; reason?: string } {
  if (!Number.isFinite(update.latitude) || update.latitude < -90 || update.latitude > 90) {
    return { valid: false, reason: "Latitude must be between -90 and 90." };
  }

  if (!Number.isFinite(update.longitude) || update.longitude < -180 || update.longitude > 180) {
    return { valid: false, reason: "Longitude must be between -180 and 180." };
  }

  const recordedAtMs = update.recordedAt.getTime();
  if (!Number.isFinite(recordedAtMs)) {
    return { valid: false, reason: "recordedAt must be a valid timestamp." };
  }

  const now = Date.now();
  if (recordedAtMs > now + FUTURE_TOLERANCE_MS) {
    return { valid: false, reason: "Location timestamp cannot be in the future." };
  }

  if (recordedAtMs < now - MAX_LOCATION_AGE_MS) {
    return { valid: false, reason: "Location timestamp is too old." };
  }

  if (
    update.heading !== null
    && update.heading !== undefined
    && (!Number.isFinite(update.heading) || update.heading < 0 || update.heading > 360)
  ) {
    return { valid: false, reason: "Heading must be between 0 and 360." };
  }

  if (
    update.speed !== null
    && update.speed !== undefined
    && (!Number.isFinite(update.speed) || update.speed < 0)
  ) {
    return { valid: false, reason: "Speed must be greater than or equal to 0." };
  }

  if (
    update.accuracy !== null
    && update.accuracy !== undefined
    && (!Number.isFinite(update.accuracy) || update.accuracy < 0)
  ) {
    return { valid: false, reason: "Accuracy must be greater than or equal to 0." };
  }

  return { valid: true };
}

const TRACKABLE_TRIP_STATUSES = [
  "assigned",
  "operator_en_route",
  "operator_arrived",
  "in_progress",
] as const;

export async function startTrackingSession(
  tripId: string,
  operatorUserId: string,
): Promise<typeof aderoTrackingSessions.$inferSelect> {
  const [trip] = await db
    .select({
      id: aderoTrips.id,
      operatorId: aderoTrips.operatorId,
      status: aderoTrips.status,
    })
    .from(aderoTrips)
    .where(eq(aderoTrips.id, tripId))
    .limit(1);

  if (!trip) {
    throw new Error("Trip not found.");
  }

  if (!TRACKABLE_TRIP_STATUSES.includes(trip.status as (typeof TRACKABLE_TRIP_STATUSES)[number])) {
    throw new Error(`Trip status \"${trip.status}\" is not trackable.`);
  }

  if (trip.operatorId !== operatorUserId) {
    throw new Error("Forbidden: trip is not assigned to this operator.");
  }

  const [existingSession] = await db
    .select()
    .from(aderoTrackingSessions)
    .where(and(eq(aderoTrackingSessions.tripId, tripId), isNull(aderoTrackingSessions.endedAt)))
    .limit(1);

  const activeSession = existingSession
    ?? (
      await db
        .insert(aderoTrackingSessions)
        .values({
          tripId,
          operatorUserId,
          startedAt: new Date(),
          locationCount: 0,
          totalDistanceMiles: "0.00",
          createdAt: new Date(),
        })
        .returning()
    )[0];

  if (!activeSession) {
    throw new Error("Failed to start tracking session.");
  }

  const [lastLocationRow] = await db
    .select({
      latitude: aderoOperatorLastLocations.latitude,
      longitude: aderoOperatorLastLocations.longitude,
      heading: aderoOperatorLastLocations.heading,
      speed: aderoOperatorLastLocations.speed,
      accuracy: aderoOperatorLastLocations.accuracy,
    })
    .from(aderoOperatorLastLocations)
    .where(eq(aderoOperatorLastLocations.operatorUserId, operatorUserId))
    .limit(1);

  const [latestTripLocation] = await db
    .select({
      latitude: aderoTripLocations.latitude,
      longitude: aderoTripLocations.longitude,
      heading: aderoTripLocations.heading,
      speed: aderoTripLocations.speed,
      accuracy: aderoTripLocations.accuracy,
    })
    .from(aderoTripLocations)
    .where(eq(aderoTripLocations.operatorUserId, operatorUserId))
    .orderBy(desc(aderoTripLocations.recordedAt))
    .limit(1);

  const now = new Date();

  await db
    .insert(aderoOperatorLastLocations)
    .values({
      operatorUserId,
      latitude: lastLocationRow?.latitude ?? latestTripLocation?.latitude ?? "0.0000000",
      longitude: lastLocationRow?.longitude ?? latestTripLocation?.longitude ?? "0.0000000",
      heading: lastLocationRow?.heading ?? latestTripLocation?.heading ?? null,
      speed: lastLocationRow?.speed ?? latestTripLocation?.speed ?? null,
      accuracy: lastLocationRow?.accuracy ?? latestTripLocation?.accuracy ?? null,
      activeTripId: tripId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aderoOperatorLastLocations.operatorUserId,
      set: {
        activeTripId: tripId,
        updatedAt: now,
      },
    });

  return activeSession;
}

export async function endTrackingSession(
  sessionId: string,
): Promise<typeof aderoTrackingSessions.$inferSelect> {
  const [session] = await db
    .select()
    .from(aderoTrackingSessions)
    .where(eq(aderoTrackingSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error("Tracking session not found.");
  }

  if (session.endedAt) {
    return session;
  }

  const now = new Date();
  const durationHours = Math.max(0, (now.getTime() - session.startedAt.getTime()) / (1000 * 60 * 60));
  const totalDistanceMiles = toNumber(session.totalDistanceMiles);

  const averageSpeedMph =
    session.locationCount > 1 && durationHours > 0
      ? toDecimal(totalDistanceMiles / durationHours)
      : null;

  const [updatedSession] = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(aderoTrackingSessions)
      .set({
        endedAt: now,
        averageSpeedMph,
      })
      .where(eq(aderoTrackingSessions.id, session.id))
      .returning();

    await tx
      .update(aderoOperatorLastLocations)
      .set({
        activeTripId: null,
        updatedAt: now,
      })
      .where(eq(aderoOperatorLastLocations.operatorUserId, session.operatorUserId));

    return [updated];
  });

  if (!updatedSession) {
    throw new Error("Failed to end tracking session.");
  }

  return updatedSession;
}

export async function recordLocation(
  sessionId: string,
  update: LocationUpdate,
): Promise<{
  recorded: boolean;
  location?: typeof aderoTripLocations.$inferSelect;
  reason?: string;
  eta?: Awaited<ReturnType<typeof updateEtaOnLocationChange>>["eta"];
  geofenceEvent?: Awaited<ReturnType<typeof updateEtaOnLocationChange>>["geofenceEvent"];
}> {
  const [session] = await db
    .select()
    .from(aderoTrackingSessions)
    .where(eq(aderoTrackingSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error("Tracking session not found.");
  }

  if (session.endedAt) {
    throw new Error("Tracking session has already ended.");
  }

  const validation = validateLocationUpdate(update);
  if (!validation.valid) {
    if (validation.reason) {
      return { recorded: false, reason: validation.reason };
    }
    return { recorded: false };
  }

  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const [previousLocation] = await tx
      .select({
        id: aderoTripLocations.id,
        latitude: aderoTripLocations.latitude,
        longitude: aderoTripLocations.longitude,
        recordedAt: aderoTripLocations.recordedAt,
      })
      .from(aderoTripLocations)
      .where(
        and(
          eq(aderoTripLocations.tripId, session.tripId),
          eq(aderoTripLocations.operatorUserId, session.operatorUserId),
        ),
      )
      .orderBy(desc(aderoTripLocations.recordedAt))
      .limit(1);

    if (
      previousLocation
      && update.recordedAt.getTime() - previousLocation.recordedAt.getTime() < MIN_LOCATION_INTERVAL_MS
    ) {
      return { recorded: false, reason: "Too frequent" };
    }

    const [insertedLocation] = await tx
      .insert(aderoTripLocations)
      .values({
        tripId: session.tripId,
        operatorUserId: session.operatorUserId,
        latitude: toCoordinate(update.latitude),
        longitude: toCoordinate(update.longitude),
        altitude: toNullableDecimal(update.altitude, 2),
        heading: toNullableDecimal(update.heading, 1),
        speed: toNullableDecimal(update.speed, 2),
        accuracy: toNullableDecimal(update.accuracy, 2),
        source: update.source ?? "gps",
        recordedAt: update.recordedAt,
        createdAt: now,
      })
      .returning();

    if (!insertedLocation) {
      return { recorded: false, reason: "Location insert failed." };
    }

    const distanceMiles = previousLocation
      ? calculateDistanceBetweenPoints(
        toNumber(previousLocation.latitude),
        toNumber(previousLocation.longitude),
        update.latitude,
        update.longitude,
      )
      : 0;

    const nextLocationCount = session.locationCount + 1;
    const nextTotalDistance = round(toNumber(session.totalDistanceMiles) + distanceMiles, 2);

    await tx
      .update(aderoTrackingSessions)
      .set({
        locationCount: nextLocationCount,
        totalDistanceMiles: toDecimal(nextTotalDistance, 2),
      })
      .where(eq(aderoTrackingSessions.id, session.id));

    await tx
      .insert(aderoOperatorLastLocations)
      .values({
        operatorUserId: session.operatorUserId,
        latitude: toCoordinate(update.latitude),
        longitude: toCoordinate(update.longitude),
        heading: toNullableDecimal(update.heading, 1),
        speed: toNullableDecimal(update.speed, 2),
        accuracy: toNullableDecimal(update.accuracy, 2),
        activeTripId: session.tripId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: aderoOperatorLastLocations.operatorUserId,
        set: {
          latitude: toCoordinate(update.latitude),
          longitude: toCoordinate(update.longitude),
          heading: toNullableDecimal(update.heading, 1),
          speed: toNullableDecimal(update.speed, 2),
          accuracy: toNullableDecimal(update.accuracy, 2),
          activeTripId: session.tripId,
          updatedAt: now,
        },
      });

    return { recorded: true, location: insertedLocation };
  });

  if (!result.recorded || !result.location) {
    return result;
  }

  try {
    const etaUpdate = await updateEtaOnLocationChange(
      session.tripId,
      session.operatorUserId,
      update.latitude,
      update.longitude,
      update.speed ?? null,
    );

    return {
      ...result,
      eta: etaUpdate.eta,
      geofenceEvent: etaUpdate.geofenceEvent,
    };
  } catch (error) {
    console.error("[adero/tracking] ETA update failed:", error);
    return {
      ...result,
      eta: null,
      geofenceEvent: null,
    };
  }
}

export async function getLatestLocation(
  tripId: string,
): Promise<typeof aderoTripLocations.$inferSelect | null> {
  const [location] = await db
    .select()
    .from(aderoTripLocations)
    .where(eq(aderoTripLocations.tripId, tripId))
    .orderBy(desc(aderoTripLocations.recordedAt))
    .limit(1);

  return location ?? null;
}

export async function getOperatorLastLocation(
  operatorUserId: string,
): Promise<typeof aderoOperatorLastLocations.$inferSelect | null> {
  const [location] = await db
    .select()
    .from(aderoOperatorLastLocations)
    .where(eq(aderoOperatorLastLocations.operatorUserId, operatorUserId))
    .limit(1);

  return location ?? null;
}

export async function getTripLocationHistory(
  tripId: string,
  limit?: number,
): Promise<(typeof aderoTripLocations.$inferSelect)[]> {
  if (typeof limit === "number") {
    return db
      .select()
      .from(aderoTripLocations)
      .where(eq(aderoTripLocations.tripId, tripId))
      .orderBy(asc(aderoTripLocations.recordedAt))
      .limit(limit);
  }

  return db
    .select()
    .from(aderoTripLocations)
    .where(eq(aderoTripLocations.tripId, tripId))
    .orderBy(asc(aderoTripLocations.recordedAt));
}

export async function getActiveTrackingSession(
  tripId: string,
): Promise<typeof aderoTrackingSessions.$inferSelect | null> {
  const [session] = await db
    .select()
    .from(aderoTrackingSessions)
    .where(and(eq(aderoTrackingSessions.tripId, tripId), isNull(aderoTrackingSessions.endedAt)))
    .limit(1);

  return session ?? null;
}

export async function isOperatorLocationStale(
  operatorUserId: string,
): Promise<boolean> {
  const lastLocation = await getOperatorLastLocation(operatorUserId);
  if (!lastLocation) {
    return true;
  }

  return Date.now() - lastLocation.updatedAt.getTime() > STALE_LOCATION_THRESHOLD_MS;
}
