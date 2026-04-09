import "server-only";

import { and, desc, eq, gte } from "drizzle-orm";
import {
  aderoNotifications,
  aderoRequests,
  aderoTripEtas,
  aderoTrips,
  aderoUsers,
  db,
} from "@raylak/db";
import type { AderoNotificationType } from "@raylak/db/schema";
import { createNotification } from "./notifications";

type GeofenceNotificationInput = {
  tripId: string;
  operatorUserId: string;
  eventType: string;
};

type EtaSummary = {
  status: string;
  estimatedDurationMinutes: number | null;
};

type SessionSummary = {
  locationCount: number;
  totalDistanceMiles: number | null;
};

function asNotificationType(value: string): AderoNotificationType {
  return value as unknown as AderoNotificationType;
}

function formatOperatorName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName.length > 0 ? fullName : user.email;
}

function parseMetadata(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function getRequesterForTrip(tripId: string): Promise<{
  requesterId: string;
  operatorId: string;
} | null> {
  const [trip] = await db
    .select({
      requesterId: aderoRequests.requesterId,
      operatorId: aderoTrips.operatorId,
    })
    .from(aderoTrips)
    .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
    .where(eq(aderoTrips.id, tripId))
    .limit(1);

  return trip ?? null;
}

export async function notifyOnGeofenceEvent(event: GeofenceNotificationInput): Promise<void> {
  const tripContext = await getRequesterForTrip(event.tripId);
  if (!tripContext) return;

  const [operator] = await db
    .select({
      firstName: aderoUsers.firstName,
      lastName: aderoUsers.lastName,
      email: aderoUsers.email,
    })
    .from(aderoUsers)
    .where(eq(aderoUsers.id, event.operatorUserId))
    .limit(1);

  const operatorName = operator ? formatOperatorName(operator) : null;

  const messageByEvent: Record<string, { title: string; message: string }> = {
    entered_pickup_zone: {
      title: "Operator approaching",
      message: "Your operator is near the pickup location",
    },
    exited_pickup_zone: {
      title: "Operator departed pickup",
      message: "Your operator has left the pickup area",
    },
    entered_dropoff_zone: {
      title: "Almost there",
      message: "Your operator is approaching the dropoff location",
    },
    exited_dropoff_zone: {
      title: "Dropoff complete",
      message: "Your operator has left the dropoff area",
    },
    entered_custom_zone: {
      title: "Zone alert",
      message: "Your operator has entered a tracked zone",
    },
  };

  const selected = messageByEvent[event.eventType];
  if (!selected) return;

  await createNotification(
    tripContext.requesterId,
    asNotificationType("tracking_geofence"),
    selected.title,
    selected.message,
    {
      tripId: event.tripId,
      eventType: event.eventType,
      operatorUserId: event.operatorUserId,
      operatorName,
    },
  );
}

export async function notifyOnEtaChange(
  tripId: string,
  previousEta: EtaSummary | null,
  newEta: EtaSummary,
): Promise<void> {
  const tripContext = await getRequesterForTrip(tripId);
  if (!tripContext) return;

  const previousStatus = previousEta?.status ?? null;
  const nextStatus = newEta.status;

  let title: string | null = null;
  let message: string | null = null;

  if (previousStatus === "on_track" && nextStatus === "delayed") {
    title = "Trip delayed";
    message = `Your trip ETA has increased. New estimate: ${newEta.estimatedDurationMinutes ?? "—"} minutes`;
  }

  if (previousStatus === "delayed" && nextStatus === "on_track") {
    title = "Back on track";
    message = `Your trip ETA has improved. Estimate: ${newEta.estimatedDurationMinutes ?? "—"} minutes`;
  }

  if (nextStatus === "arrived" && previousStatus !== "arrived") {
    const [latestEta] = await db
      .select({
        destinationType: aderoTripEtas.destinationType,
      })
      .from(aderoTripEtas)
      .where(eq(aderoTripEtas.tripId, tripId))
      .orderBy(desc(aderoTripEtas.createdAt))
      .limit(1);

    const destinationLabel = latestEta?.destinationType === "dropoff" ? "dropoff" : "pickup";
    title = "Operator arrived";
    message = `Your operator has arrived at the ${destinationLabel} location`;
  }

  if (!title || !message) {
    return;
  }

  await createNotification(
    tripContext.requesterId,
    asNotificationType("tracking_eta"),
    title,
    message,
    {
      tripId,
      previousStatus,
      newStatus: nextStatus,
    },
  );
}

export async function notifyOnTrackingSessionStart(
  tripId: string,
  operatorUserId: string,
): Promise<void> {
  const tripContext = await getRequesterForTrip(tripId);
  if (!tripContext) return;

  await createNotification(
    tripContext.requesterId,
    asNotificationType("tracking_session"),
    "Live tracking started",
    "Your operator has started sharing their location",
    {
      tripId,
      operatorUserId,
    },
  );
}

export async function notifyOnTrackingSessionEnd(
  tripId: string,
  operatorUserId: string,
  sessionSummary: SessionSummary,
): Promise<void> {
  const tripContext = await getRequesterForTrip(tripId);
  if (!tripContext) return;

  await createNotification(
    tripContext.requesterId,
    asNotificationType("tracking_session"),
    "Live tracking ended",
    `Operator location sharing has stopped. ${sessionSummary.locationCount} locations recorded.`,
    {
      tripId,
      operatorUserId,
      locationCount: sessionSummary.locationCount,
      totalDistanceMiles: sessionSummary.totalDistanceMiles,
    },
  );
}

export async function notifyOnStaleLocation(
  tripId: string,
  operatorUserId: string,
): Promise<void> {
  const tripContext = await getRequesterForTrip(tripId);
  if (!tripContext) return;

  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  const recentStaleNotifications = await db
    .select({ metadata: aderoNotifications.metadata })
    .from(aderoNotifications)
    .where(
      and(
        eq(aderoNotifications.userId, tripContext.requesterId),
        eq(aderoNotifications.type, "tracking_stale"),
        gte(aderoNotifications.createdAt, cutoff),
      ),
    );

  const recentlySentForTrip = recentStaleNotifications.some((row) => {
    const metadata = parseMetadata(row.metadata);
    return metadata?.["tripId"] === tripId;
  });

  if (recentlySentForTrip) {
    return;
  }

  await createNotification(
    tripContext.requesterId,
    asNotificationType("tracking_stale"),
    "Location update paused",
    "Your operator's location hasn't updated recently. This may be due to poor signal.",
    {
      tripId,
      operatorUserId,
    },
  );
}
