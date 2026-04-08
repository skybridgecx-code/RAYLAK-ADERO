import "server-only";

import { and, asc, desc, eq, gt } from "drizzle-orm";
import {
  aderoGeofenceEvents,
  aderoRequests,
  aderoTripEtas,
  aderoTrips,
  db,
} from "@raylak/db";
import { MILES_PER_METER, calculateDistanceBetweenPoints } from "./geo-utils";

export const DEFAULT_SPEED_MPH = 30;
export const ARRIVAL_RADIUS_MILES = 0.1;
export const PICKUP_GEOFENCE_RADIUS_MILES = 0.25;
export const DROPOFF_GEOFENCE_RADIUS_MILES = 0.25;
export const ETA_RECALCULATION_THRESHOLD_MILES = 0.05;
export const DELAYED_THRESHOLD_MINUTES = 10;

const GEOFENCE_DEDUPE_WINDOW_MS = 5 * 60 * 1000;

type DestinationType = "pickup" | "dropoff";
type EtaStatus = "calculating" | "on_track" | "delayed" | "arrived" | "unavailable";

export type EtaCalculationInput = {
  tripId: string;
  currentLatitude: number;
  currentLongitude: number;
  currentSpeedMph?: number | null;
  destinationType: DestinationType;
};

export type EtaResult = {
  tripId: string;
  status: EtaStatus;
  estimatedArrivalAt: Date | null;
  estimatedDurationMinutes: number | null;
  estimatedDistanceMiles: number | null;
  distanceRemainingMiles: number | null;
  destinationType: string;
  currentLatitude: number;
  currentLongitude: number;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
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

function toNullableCoordinate(value: number | null): string | null {
  if (value === null) return null;
  return toCoordinate(value);
}

function hashAddress(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i += 1) {
    hash = (hash + address.charCodeAt(i) * (i + 1)) % 100000;
  }
  return hash;
}

export async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const normalized = address.trim();
  if (!normalized) return null;

  // TODO: Replace with real geocoding provider (Google Maps, Mapbox)
  const hash = hashAddress(normalized);
  const latOffset = (hash % 1000) / 100;
  const lonOffset = (Math.floor(hash / 7) % 1000) / 100;

  return {
    latitude: round(33 + latOffset, 7),
    longitude: round(-118 + lonOffset, 7),
  };
}

export async function getDestinationCoordinates(
  tripId: string,
  destinationType: DestinationType,
): Promise<{ latitude: number; longitude: number } | null> {
  const [tripRequest] = await db
    .select({
      pickupAddress: aderoRequests.pickupAddress,
      dropoffAddress: aderoRequests.dropoffAddress,
    })
    .from(aderoTrips)
    .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
    .where(eq(aderoTrips.id, tripId))
    .limit(1);

  if (!tripRequest) return null;

  const address =
    destinationType === "pickup"
      ? tripRequest.pickupAddress
      : tripRequest.dropoffAddress;

  return geocodeAddress(address);
}

export async function getLatestEta(
  tripId: string,
): Promise<typeof aderoTripEtas.$inferSelect | null> {
  const [eta] = await db
    .select()
    .from(aderoTripEtas)
    .where(eq(aderoTripEtas.tripId, tripId))
    .orderBy(desc(aderoTripEtas.createdAt))
    .limit(1);

  return eta ?? null;
}

export async function calculateEta(input: EtaCalculationInput): Promise<EtaResult> {
  const destination = await getDestinationCoordinates(
    input.tripId,
    input.destinationType,
  );

  if (!destination) {
    return {
      tripId: input.tripId,
      status: "unavailable",
      estimatedArrivalAt: null,
      estimatedDurationMinutes: null,
      estimatedDistanceMiles: null,
      distanceRemainingMiles: null,
      destinationType: input.destinationType,
      currentLatitude: input.currentLatitude,
      currentLongitude: input.currentLongitude,
      destinationLatitude: null,
      destinationLongitude: null,
    };
  }

  const distanceRemaining = round(
    calculateDistanceBetweenPoints(
      input.currentLatitude,
      input.currentLongitude,
      destination.latitude,
      destination.longitude,
    ),
    2,
  );

  if (distanceRemaining <= ARRIVAL_RADIUS_MILES) {
    return {
      tripId: input.tripId,
      status: "arrived",
      estimatedArrivalAt: new Date(),
      estimatedDurationMinutes: 0,
      estimatedDistanceMiles: distanceRemaining,
      distanceRemainingMiles: distanceRemaining,
      destinationType: input.destinationType,
      currentLatitude: input.currentLatitude,
      currentLongitude: input.currentLongitude,
      destinationLatitude: destination.latitude,
      destinationLongitude: destination.longitude,
    };
  }

  const speedMph =
    input.currentSpeedMph && input.currentSpeedMph > 0
      ? input.currentSpeedMph
      : DEFAULT_SPEED_MPH;

  const durationMinutes = Math.max(
    1,
    Math.round((distanceRemaining / speedMph) * 60),
  );
  const estimatedArrivalAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  const previousEta = await getLatestEta(input.tripId);
  let status: EtaStatus = "on_track";
  if (
    previousEta
    && previousEta.estimatedDurationMinutes !== null
    && durationMinutes - previousEta.estimatedDurationMinutes >= DELAYED_THRESHOLD_MINUTES
  ) {
    status = "delayed";
  }

  return {
    tripId: input.tripId,
    status,
    estimatedArrivalAt,
    estimatedDurationMinutes: durationMinutes,
    estimatedDistanceMiles: distanceRemaining,
    distanceRemainingMiles: distanceRemaining,
    destinationType: input.destinationType,
    currentLatitude: input.currentLatitude,
    currentLongitude: input.currentLongitude,
    destinationLatitude: destination.latitude,
    destinationLongitude: destination.longitude,
  };
}

export async function saveEta(
  result: EtaResult,
): Promise<typeof aderoTripEtas.$inferSelect> {
  const now = new Date();
  const [saved] = await db
    .insert(aderoTripEtas)
    .values({
      tripId: result.tripId,
      status: result.status,
      estimatedArrivalAt: result.estimatedArrivalAt,
      estimatedDurationMinutes: result.estimatedDurationMinutes,
      estimatedDistanceMiles:
        result.estimatedDistanceMiles === null
          ? null
          : toDecimal(result.estimatedDistanceMiles, 2),
      distanceRemainingMiles:
        result.distanceRemainingMiles === null
          ? null
          : toDecimal(result.distanceRemainingMiles, 2),
      currentLatitude: toCoordinate(result.currentLatitude),
      currentLongitude: toCoordinate(result.currentLongitude),
      destinationLatitude: toNullableCoordinate(result.destinationLatitude),
      destinationLongitude: toNullableCoordinate(result.destinationLongitude),
      destinationType: result.destinationType,
      routePolyline: null,
      calculatedAt: now,
      metadata: null,
      createdAt: now,
    })
    .returning();

  if (!saved) {
    throw new Error("ETA could not be saved.");
  }

  return saved;
}

export async function calculateAndSaveEta(
  input: EtaCalculationInput,
): Promise<typeof aderoTripEtas.$inferSelect> {
  const eta = await calculateEta(input);
  return saveEta(eta);
}

export async function getEtaHistory(
  tripId: string,
): Promise<(typeof aderoTripEtas.$inferSelect)[]> {
  return db
    .select()
    .from(aderoTripEtas)
    .where(eq(aderoTripEtas.tripId, tripId))
    .orderBy(asc(aderoTripEtas.createdAt));
}

async function insertGeofenceEvent(params: {
  tripId: string;
  operatorUserId: string;
  eventType: typeof aderoGeofenceEvents.$inferInsert.eventType;
  latitude: number;
  longitude: number;
  radiusMiles: number;
  triggerLatitude: number;
  triggerLongitude: number;
  distanceMiles: number;
}): Promise<typeof aderoGeofenceEvents.$inferSelect | null> {
  const dedupeThreshold = new Date(Date.now() - GEOFENCE_DEDUPE_WINDOW_MS);

  const [duplicate] = await db
    .select({ id: aderoGeofenceEvents.id })
    .from(aderoGeofenceEvents)
    .where(
      and(
        eq(aderoGeofenceEvents.tripId, params.tripId),
        eq(aderoGeofenceEvents.operatorUserId, params.operatorUserId),
        eq(aderoGeofenceEvents.eventType, params.eventType),
        gt(aderoGeofenceEvents.triggeredAt, dedupeThreshold),
      ),
    )
    .limit(1);

  if (duplicate) {
    return null;
  }

  const [event] = await db
    .insert(aderoGeofenceEvents)
    .values({
      tripId: params.tripId,
      operatorUserId: params.operatorUserId,
      eventType: params.eventType,
      latitude: toCoordinate(params.latitude),
      longitude: toCoordinate(params.longitude),
      radiusMeters: toDecimal(params.radiusMiles / MILES_PER_METER, 2),
      triggerLatitude: toCoordinate(params.triggerLatitude),
      triggerLongitude: toCoordinate(params.triggerLongitude),
      metadata: {
        distanceMiles: round(params.distanceMiles, 2),
      },
      triggeredAt: new Date(),
      createdAt: new Date(),
    })
    .returning();

  return event ?? null;
}

export async function checkGeofence(
  tripId: string,
  operatorUserId: string,
  latitude: number,
  longitude: number,
): Promise<typeof aderoGeofenceEvents.$inferSelect | null> {
  const [tripRequest] = await db
    .select({
      tripStatus: aderoTrips.status,
      pickupAddress: aderoRequests.pickupAddress,
      dropoffAddress: aderoRequests.dropoffAddress,
    })
    .from(aderoTrips)
    .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
    .where(eq(aderoTrips.id, tripId))
    .limit(1);

  if (!tripRequest) return null;

  const [pickupCoords, dropoffCoords] = await Promise.all([
    geocodeAddress(tripRequest.pickupAddress),
    geocodeAddress(tripRequest.dropoffAddress),
  ]);

  if (pickupCoords) {
    const pickupDistance = calculateDistanceBetweenPoints(
      latitude,
      longitude,
      pickupCoords.latitude,
      pickupCoords.longitude,
    );

    if (pickupDistance <= PICKUP_GEOFENCE_RADIUS_MILES) {
      let eventType: typeof aderoGeofenceEvents.$inferInsert.eventType | null = null;
      if (
        tripRequest.tripStatus === "operator_en_route"
        || tripRequest.tripStatus === "assigned"
      ) {
        eventType = "entered_pickup_zone";
      } else if (tripRequest.tripStatus === "in_progress") {
        eventType = "exited_pickup_zone";
      }

      if (eventType) {
        const pickupEvent = await insertGeofenceEvent({
          tripId,
          operatorUserId,
          eventType,
          latitude,
          longitude,
          radiusMiles: PICKUP_GEOFENCE_RADIUS_MILES,
          triggerLatitude: pickupCoords.latitude,
          triggerLongitude: pickupCoords.longitude,
          distanceMiles: pickupDistance,
        });
        if (pickupEvent) return pickupEvent;
      }
    }
  }

  if (dropoffCoords) {
    const dropoffDistance = calculateDistanceBetweenPoints(
      latitude,
      longitude,
      dropoffCoords.latitude,
      dropoffCoords.longitude,
    );

    if (
      dropoffDistance <= DROPOFF_GEOFENCE_RADIUS_MILES
      && tripRequest.tripStatus === "in_progress"
    ) {
      const dropoffEvent = await insertGeofenceEvent({
        tripId,
        operatorUserId,
        eventType: "entered_dropoff_zone",
        latitude,
        longitude,
        radiusMiles: DROPOFF_GEOFENCE_RADIUS_MILES,
        triggerLatitude: dropoffCoords.latitude,
        triggerLongitude: dropoffCoords.longitude,
        distanceMiles: dropoffDistance,
      });
      if (dropoffEvent) return dropoffEvent;
    }
  }

  return null;
}

export async function updateEtaOnLocationChange(
  tripId: string,
  operatorUserId: string,
  latitude: number,
  longitude: number,
  speedMph?: number | null,
): Promise<{
  eta: typeof aderoTripEtas.$inferSelect | null;
  geofenceEvent: typeof aderoGeofenceEvents.$inferSelect | null;
}> {
  const [trip] = await db
    .select({
      status: aderoTrips.status,
    })
    .from(aderoTrips)
    .where(eq(aderoTrips.id, tripId))
    .limit(1);

  if (!trip) {
    throw new Error("Trip not found.");
  }

  if (trip.status === "completed" || trip.status === "canceled") {
    return { eta: null, geofenceEvent: null };
  }

  let destinationType: DestinationType | null = null;
  if (
    trip.status === "assigned"
    || trip.status === "operator_en_route"
    || trip.status === "operator_arrived"
  ) {
    destinationType = "pickup";
  } else if (trip.status === "in_progress") {
    destinationType = "dropoff";
  }

  if (!destinationType) {
    return { eta: null, geofenceEvent: null };
  }

  const latestEta = await getLatestEta(tripId);
  let shouldRecalculate = true;

  if (
    latestEta
    && latestEta.currentLatitude !== null
    && latestEta.currentLongitude !== null
    && latestEta.destinationType === destinationType
  ) {
    const movedMiles = calculateDistanceBetweenPoints(
      toNumber(latestEta.currentLatitude),
      toNumber(latestEta.currentLongitude),
      latitude,
      longitude,
    );
    shouldRecalculate = movedMiles >= ETA_RECALCULATION_THRESHOLD_MILES;
  }

  const eta = shouldRecalculate
    ? await calculateAndSaveEta({
      tripId,
      currentLatitude: latitude,
      currentLongitude: longitude,
      currentSpeedMph: speedMph ?? null,
      destinationType,
    })
    : null;

  const geofenceEvent = await checkGeofence(
    tripId,
    operatorUserId,
    latitude,
    longitude,
  );

  return { eta, geofenceEvent };
}
