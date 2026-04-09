"use server";

import "server-only";

import { cookies } from "next/headers";
import { and, count, desc, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import {
  aderoGeofenceEvents,
  aderoOperatorLastLocations,
  aderoRequests,
  aderoTrackingSessions,
  aderoTripEtas,
  aderoTripLocations,
  aderoTrips,
  aderoUsers,
  db,
} from "@raylak/db";
import { getEtaHistory, getLatestEta } from "@/lib/eta";
import {
  getActiveTrackingSession,
  getLatestLocation,
  STALE_LOCATION_THRESHOLD_MS,
} from "@/lib/tracking";

const ACTIVE_TRIP_STATUSES = [
  "assigned",
  "operator_en_route",
  "operator_arrived",
  "in_progress",
] as const;

const TRIP_STATUS_PRIORITY: Record<string, number> = {
  in_progress: 4,
  operator_arrived: 3,
  operator_en_route: 2,
  assigned: 1,
};

export type FleetOverview = {
  activeTripsCount: number;
  trackingActiveCount: number;
  withoutTrackingCount: number;
  operatorsOnlineCount: number;
  staleOperatorsCount: number;
  locationUpdatesTodayCount: number;
  geofenceEventsTodayCount: number;
  averageTrackingSessionDurationMinutes: number;
};

function toNumber(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

async function assertAdminAccess(): Promise<void> {
  const secret = process.env["ADERO_ADMIN_SECRET"];
  const cookieStore = await cookies();
  const session = cookieStore.get("adero_admin")?.value;

  if (!secret || session !== secret) {
    throw new Error("Admin access required.");
  }
}

export async function getActiveTripsWithTracking() {
  await assertAdminAccess();

  const trips = await db
    .select({
      tripId: aderoTrips.id,
      requestId: aderoTrips.requestId,
      operatorId: aderoTrips.operatorId,
      tripStatus: aderoTrips.status,
      tripCreatedAt: aderoTrips.createdAt,
      pickupAddress: aderoRequests.pickupAddress,
      dropoffAddress: aderoRequests.dropoffAddress,
      operatorEmail: aderoUsers.email,
    })
    .from(aderoTrips)
    .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
    .innerJoin(aderoUsers, eq(aderoTrips.operatorId, aderoUsers.id))
    .where(inArray(aderoTrips.status, [...ACTIVE_TRIP_STATUSES]))
    .orderBy(desc(aderoTrips.createdAt));

  if (trips.length === 0) {
    return [];
  }

  const tripIds = trips.map((trip) => trip.tripId);
  const operatorIds = trips.map((trip) => trip.operatorId);

  const [lastLocations, etaRows, activeSessions] = await Promise.all([
    db
      .select({
        operatorUserId: aderoOperatorLastLocations.operatorUserId,
        latitude: aderoOperatorLastLocations.latitude,
        longitude: aderoOperatorLastLocations.longitude,
        heading: aderoOperatorLastLocations.heading,
        speed: aderoOperatorLastLocations.speed,
        accuracy: aderoOperatorLastLocations.accuracy,
        activeTripId: aderoOperatorLastLocations.activeTripId,
        updatedAt: aderoOperatorLastLocations.updatedAt,
      })
      .from(aderoOperatorLastLocations)
      .where(inArray(aderoOperatorLastLocations.operatorUserId, operatorIds)),
    db
      .select({
        tripId: aderoTripEtas.tripId,
        status: aderoTripEtas.status,
        estimatedArrivalAt: aderoTripEtas.estimatedArrivalAt,
        estimatedDurationMinutes: aderoTripEtas.estimatedDurationMinutes,
        distanceRemainingMiles: aderoTripEtas.distanceRemainingMiles,
        destinationType: aderoTripEtas.destinationType,
        createdAt: aderoTripEtas.createdAt,
      })
      .from(aderoTripEtas)
      .where(inArray(aderoTripEtas.tripId, tripIds))
      .orderBy(desc(aderoTripEtas.createdAt)),
    db
      .select({
        id: aderoTrackingSessions.id,
        tripId: aderoTrackingSessions.tripId,
        operatorUserId: aderoTrackingSessions.operatorUserId,
        startedAt: aderoTrackingSessions.startedAt,
        locationCount: aderoTrackingSessions.locationCount,
        totalDistanceMiles: aderoTrackingSessions.totalDistanceMiles,
      })
      .from(aderoTrackingSessions)
      .where(
        and(
          inArray(aderoTrackingSessions.tripId, tripIds),
          isNull(aderoTrackingSessions.endedAt),
        ),
      )
      .orderBy(desc(aderoTrackingSessions.startedAt)),
  ]);

  const locationByOperatorId = new Map(lastLocations.map((row) => [row.operatorUserId, row]));

  const etaByTripId = new Map<string, (typeof etaRows)[number]>();
  for (const eta of etaRows) {
    if (!etaByTripId.has(eta.tripId)) {
      etaByTripId.set(eta.tripId, eta);
    }
  }

  const sessionByTripId = new Map<string, (typeof activeSessions)[number]>();
  for (const session of activeSessions) {
    if (!sessionByTripId.has(session.tripId)) {
      sessionByTripId.set(session.tripId, session);
    }
  }

  return trips
    .map((trip) => {
      const location = locationByOperatorId.get(trip.operatorId) ?? null;
      const latestEta = etaByTripId.get(trip.tripId) ?? null;
      const activeSession = sessionByTripId.get(trip.tripId) ?? null;
      const isLocationStale =
        !location || Date.now() - location.updatedAt.getTime() > STALE_LOCATION_THRESHOLD_MS;

      return {
        tripId: trip.tripId,
        requestId: trip.requestId,
        operatorId: trip.operatorId,
        operatorEmail: trip.operatorEmail,
        tripStatus: trip.tripStatus,
        tripCreatedAt: trip.tripCreatedAt,
        pickupAddress: trip.pickupAddress,
        dropoffAddress: trip.dropoffAddress,
        latestLocation: location
          ? {
              latitude: toNumber(location.latitude),
              longitude: toNumber(location.longitude),
              heading: location.heading === null ? null : toNumber(location.heading),
              speed: location.speed === null ? null : toNumber(location.speed),
              accuracy: location.accuracy === null ? null : toNumber(location.accuracy),
              activeTripId: location.activeTripId,
              updatedAt: location.updatedAt,
            }
          : null,
        latestEta: latestEta
          ? {
              status: latestEta.status,
              estimatedArrivalAt: latestEta.estimatedArrivalAt,
              estimatedDurationMinutes: latestEta.estimatedDurationMinutes,
              distanceRemainingMiles:
                latestEta.distanceRemainingMiles === null
                  ? null
                  : toNumber(latestEta.distanceRemainingMiles),
              destinationType: latestEta.destinationType,
              createdAt: latestEta.createdAt,
            }
          : null,
        activeSession: activeSession
          ? {
              id: activeSession.id,
              startedAt: activeSession.startedAt,
              locationCount: activeSession.locationCount,
              totalDistanceMiles: toNumber(activeSession.totalDistanceMiles),
            }
          : null,
        isLocationStale,
      };
    })
    .sort((a, b) => {
      const aTracking = a.activeSession ? 1 : 0;
      const bTracking = b.activeSession ? 1 : 0;
      if (aTracking !== bTracking) {
        return bTracking - aTracking;
      }

      const aPriority = TRIP_STATUS_PRIORITY[a.tripStatus] ?? 0;
      const bPriority = TRIP_STATUS_PRIORITY[b.tripStatus] ?? 0;
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return b.tripCreatedAt.getTime() - a.tripCreatedAt.getTime();
    });
}

export async function getFleetOverview(): Promise<FleetOverview> {
  await assertAdminAccess();

  const now = Date.now();
  const staleCutoff = new Date(now - STALE_LOCATION_THRESHOLD_MS);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [activeTrips, activeSessions, operatorLastLocations, locationUpdatesToday, geofenceEventsToday, completedSessionsToday] =
    await Promise.all([
      db
        .select({ id: aderoTrips.id })
        .from(aderoTrips)
        .where(inArray(aderoTrips.status, [...ACTIVE_TRIP_STATUSES])),
      db
        .select({ tripId: aderoTrackingSessions.tripId })
        .from(aderoTrackingSessions)
        .innerJoin(aderoTrips, eq(aderoTrackingSessions.tripId, aderoTrips.id))
        .where(
          and(
            isNull(aderoTrackingSessions.endedAt),
            inArray(aderoTrips.status, [...ACTIVE_TRIP_STATUSES]),
          ),
        ),
      db
        .select({ updatedAt: aderoOperatorLastLocations.updatedAt })
        .from(aderoOperatorLastLocations),
      db
        .select({ value: count() })
        .from(aderoTripLocations)
        .where(gte(aderoTripLocations.createdAt, startOfDay)),
      db
        .select({ value: count() })
        .from(aderoGeofenceEvents)
        .where(gte(aderoGeofenceEvents.triggeredAt, startOfDay)),
      db
        .select({
          startedAt: aderoTrackingSessions.startedAt,
          endedAt: aderoTrackingSessions.endedAt,
        })
        .from(aderoTrackingSessions)
        .where(
          and(
            isNotNull(aderoTrackingSessions.endedAt),
            gte(aderoTrackingSessions.endedAt, startOfDay),
          ),
        ),
    ]);

  const uniqueTrackedTripIds = new Set(activeSessions.map((session) => session.tripId));
  const trackingActiveCount = uniqueTrackedTripIds.size;
  const activeTripsCount = activeTrips.length;
  const withoutTrackingCount = Math.max(0, activeTripsCount - trackingActiveCount);

  let operatorsOnlineCount = 0;
  let staleOperatorsCount = 0;
  for (const row of operatorLastLocations) {
    if (row.updatedAt.getTime() >= staleCutoff.getTime()) {
      operatorsOnlineCount += 1;
    } else {
      staleOperatorsCount += 1;
    }
  }

  const durations = completedSessionsToday
    .map((session) => {
      if (!session.endedAt) return 0;
      return Math.max(0, (session.endedAt.getTime() - session.startedAt.getTime()) / (1000 * 60));
    })
    .filter((duration) => duration > 0);

  const averageTrackingSessionDurationMinutes =
    durations.length > 0
      ? round(durations.reduce((sum, value) => sum + value, 0) / durations.length, 1)
      : 0;

  return {
    activeTripsCount,
    trackingActiveCount,
    withoutTrackingCount,
    operatorsOnlineCount,
    staleOperatorsCount,
    locationUpdatesTodayCount: Number(locationUpdatesToday[0]?.value ?? 0),
    geofenceEventsTodayCount: Number(geofenceEventsToday[0]?.value ?? 0),
    averageTrackingSessionDurationMinutes,
  };
}

export async function getTripTrackingDetail(tripId: string) {
  await assertAdminAccess();

  const [trip] = await db
    .select({
      tripId: aderoTrips.id,
      requestId: aderoTrips.requestId,
      operatorId: aderoTrips.operatorId,
      tripStatus: aderoTrips.status,
      tripCreatedAt: aderoTrips.createdAt,
      pickupAddress: aderoRequests.pickupAddress,
      dropoffAddress: aderoRequests.dropoffAddress,
      operatorEmail: aderoUsers.email,
    })
    .from(aderoTrips)
    .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
    .innerJoin(aderoUsers, eq(aderoTrips.operatorId, aderoUsers.id))
    .where(eq(aderoTrips.id, tripId))
    .limit(1);

  if (!trip) {
    throw new Error("Trip not found.");
  }

  const [
    latestLocation,
    latestEta,
    activeSession,
    latestSessionRow,
    locationHistoryRows,
    geofenceRows,
    etaHistoryRows,
  ] =
    await Promise.all([
      getLatestLocation(tripId),
      getLatestEta(tripId),
      getActiveTrackingSession(tripId),
      db
        .select({
          id: aderoTrackingSessions.id,
          startedAt: aderoTrackingSessions.startedAt,
          endedAt: aderoTrackingSessions.endedAt,
          locationCount: aderoTrackingSessions.locationCount,
          totalDistanceMiles: aderoTrackingSessions.totalDistanceMiles,
          averageSpeedMph: aderoTrackingSessions.averageSpeedMph,
        })
        .from(aderoTrackingSessions)
        .where(eq(aderoTrackingSessions.tripId, tripId))
        .orderBy(desc(aderoTrackingSessions.startedAt))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      db
        .select({
          id: aderoTripLocations.id,
          latitude: aderoTripLocations.latitude,
          longitude: aderoTripLocations.longitude,
          heading: aderoTripLocations.heading,
          speed: aderoTripLocations.speed,
          accuracy: aderoTripLocations.accuracy,
          recordedAt: aderoTripLocations.recordedAt,
        })
        .from(aderoTripLocations)
        .where(eq(aderoTripLocations.tripId, tripId))
        .orderBy(desc(aderoTripLocations.recordedAt))
        .limit(100),
      db
        .select({
          id: aderoGeofenceEvents.id,
          eventType: aderoGeofenceEvents.eventType,
          triggeredAt: aderoGeofenceEvents.triggeredAt,
          latitude: aderoGeofenceEvents.latitude,
          longitude: aderoGeofenceEvents.longitude,
          radiusMeters: aderoGeofenceEvents.radiusMeters,
        })
        .from(aderoGeofenceEvents)
        .where(eq(aderoGeofenceEvents.tripId, tripId))
        .orderBy(desc(aderoGeofenceEvents.triggeredAt)),
      getEtaHistory(tripId),
    ]);

  return {
    trip: {
      tripId: trip.tripId,
      requestId: trip.requestId,
      operatorId: trip.operatorId,
      operatorEmail: trip.operatorEmail,
      tripStatus: trip.tripStatus,
      pickupAddress: trip.pickupAddress,
      dropoffAddress: trip.dropoffAddress,
      tripCreatedAt: trip.tripCreatedAt,
    },
    latestLocation: latestLocation
      ? {
          id: latestLocation.id,
          latitude: toNumber(latestLocation.latitude),
          longitude: toNumber(latestLocation.longitude),
          heading: latestLocation.heading === null ? null : toNumber(latestLocation.heading),
          speed: latestLocation.speed === null ? null : toNumber(latestLocation.speed),
          accuracy: latestLocation.accuracy === null ? null : toNumber(latestLocation.accuracy),
          recordedAt: latestLocation.recordedAt,
        }
      : null,
    latestEta: latestEta
      ? {
          id: latestEta.id,
          status: latestEta.status,
          estimatedArrivalAt: latestEta.estimatedArrivalAt,
          estimatedDurationMinutes: latestEta.estimatedDurationMinutes,
          estimatedDistanceMiles:
            latestEta.estimatedDistanceMiles === null
              ? null
              : toNumber(latestEta.estimatedDistanceMiles),
          distanceRemainingMiles:
            latestEta.distanceRemainingMiles === null
              ? null
              : toNumber(latestEta.distanceRemainingMiles),
          destinationType: latestEta.destinationType,
          createdAt: latestEta.createdAt,
        }
      : null,
    activeSession: activeSession
      ? {
          id: activeSession.id,
          startedAt: activeSession.startedAt,
          endedAt: activeSession.endedAt,
          locationCount: activeSession.locationCount,
          totalDistanceMiles: toNumber(activeSession.totalDistanceMiles),
          averageSpeedMph:
            activeSession.averageSpeedMph === null ? null : toNumber(activeSession.averageSpeedMph),
        }
      : null,
    trackingSession: latestSessionRow
      ? {
          id: latestSessionRow.id,
          startedAt: latestSessionRow.startedAt,
          endedAt: latestSessionRow.endedAt,
          locationCount: latestSessionRow.locationCount,
          totalDistanceMiles: toNumber(latestSessionRow.totalDistanceMiles),
          averageSpeedMph:
            latestSessionRow.averageSpeedMph === null
              ? null
              : toNumber(latestSessionRow.averageSpeedMph),
          isActive: latestSessionRow.endedAt === null,
        }
      : null,
    locationHistory: locationHistoryRows.map((point) => ({
      id: point.id,
      latitude: toNumber(point.latitude),
      longitude: toNumber(point.longitude),
      heading: point.heading === null ? null : toNumber(point.heading),
      speed: point.speed === null ? null : toNumber(point.speed),
      accuracy: point.accuracy === null ? null : toNumber(point.accuracy),
      recordedAt: point.recordedAt,
    })),
    geofenceEvents: geofenceRows.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      latitude: toNumber(event.latitude),
      longitude: toNumber(event.longitude),
      radiusMeters: toNumber(event.radiusMeters),
      triggeredAt: event.triggeredAt,
    })),
    etaHistory: etaHistoryRows.map((eta) => ({
      id: eta.id,
      status: eta.status,
      estimatedArrivalAt: eta.estimatedArrivalAt,
      estimatedDurationMinutes: eta.estimatedDurationMinutes,
      estimatedDistanceMiles:
        eta.estimatedDistanceMiles === null ? null : toNumber(eta.estimatedDistanceMiles),
      distanceRemainingMiles:
        eta.distanceRemainingMiles === null ? null : toNumber(eta.distanceRemainingMiles),
      destinationType: eta.destinationType,
      createdAt: eta.createdAt,
    })),
  };
}

export async function getAllOperatorLocations() {
  await assertAdminAccess();

  const rows = await db
    .select({
      operatorUserId: aderoOperatorLastLocations.operatorUserId,
      operatorEmail: aderoUsers.email,
      latitude: aderoOperatorLastLocations.latitude,
      longitude: aderoOperatorLastLocations.longitude,
      heading: aderoOperatorLastLocations.heading,
      speed: aderoOperatorLastLocations.speed,
      activeTripId: aderoOperatorLastLocations.activeTripId,
      updatedAt: aderoOperatorLastLocations.updatedAt,
    })
    .from(aderoOperatorLastLocations)
    .innerJoin(aderoUsers, eq(aderoOperatorLastLocations.operatorUserId, aderoUsers.id))
    .where(eq(aderoUsers.role, "operator"))
    .orderBy(desc(aderoOperatorLastLocations.updatedAt));

  return rows.map((row) => {
    const isStale = Date.now() - row.updatedAt.getTime() > STALE_LOCATION_THRESHOLD_MS;
    return {
      operatorUserId: row.operatorUserId,
      operatorEmail: row.operatorEmail,
      latitude: toNumber(row.latitude),
      longitude: toNumber(row.longitude),
      heading: row.heading === null ? null : toNumber(row.heading),
      speed: row.speed === null ? null : toNumber(row.speed),
      activeTripId: row.activeTripId,
      updatedAt: row.updatedAt,
      isStale,
    };
  });
}
