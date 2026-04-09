import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import {
  db,
  aderoRequests,
  aderoTripStatusLog,
  aderoTrips,
  aderoUsers,
} from "@raylak/db";
import {
  ADERO_REQUEST_STATUS_LABELS,
  ADERO_SERVICE_TYPE_LABELS,
  ADERO_TRIP_STATUS_LABELS,
  type AderoRequestStatus,
  type AderoServiceType,
  type AderoTripStatus,
} from "@raylak/db/schema";
import { requireAderoRole } from "@/lib/auth";
import {
  getValidTripTransitions,
  isAderoTripStatus,
} from "@/lib/trip-lifecycle";
import { getLatestEta } from "@/lib/eta";
import {
  getActiveTrackingSession,
  getLatestLocation,
} from "@/lib/tracking";
import { getRatingsForTrip, hasUserRatedTrip } from "@/lib/ratings";
import { LocationTracker } from "@/components/location-tracker";
import { TrackingStatusBar } from "@/components/tracking-status-bar";
import { RatingForm } from "@/components/rating-form";
import { RatingDisplay } from "@/components/rating-display";
import { TripStatusControls } from "./trip-status-controls";

export const metadata: Metadata = {
  title: "Operator Trip - Adero",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const TRIP_STATUS_STYLES: Record<AderoTripStatus, { bg: string; color: string }> = {
  assigned: { bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
  operator_en_route: { bg: "rgba(59,130,246,0.12)", color: "#60a5fa" },
  operator_arrived: { bg: "rgba(20,184,166,0.12)", color: "#2dd4bf" },
  in_progress: { bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  completed: { bg: "rgba(100,116,139,0.12)", color: "#94a3b8" },
  canceled: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
};

function fmtDatetime(date: Date | null): string {
  if (!date) return "\u2014";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actorName(actor: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const fullName = [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim();
  return fullName.length > 0 ? fullName : actor.email;
}

function toNumber(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export default async function OperatorTripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireAderoRole(["operator", "admin"]).catch(() =>
    notFound(),
  );

  const [trip] = await db
    .select({
      id: aderoTrips.id,
      requestId: aderoTrips.requestId,
      operatorId: aderoTrips.operatorId,
      status: aderoTrips.status,
      pickupAddress: aderoTrips.pickupAddress,
      dropoffAddress: aderoTrips.dropoffAddress,
      scheduledAt: aderoTrips.scheduledAt,
      startedAt: aderoTrips.startedAt,
      completedAt: aderoTrips.completedAt,
      canceledAt: aderoTrips.canceledAt,
      cancelReason: aderoTrips.cancelReason,
      createdAt: aderoTrips.createdAt,
      requesterId: aderoRequests.requesterId,
      requestPickupAt: aderoRequests.pickupAt,
      requestStatus: aderoRequests.status,
      requestServiceType: aderoRequests.serviceType,
    })
    .from(aderoTrips)
    .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
    .where(eq(aderoTrips.id, id))
    .limit(1);

  if (!trip) {
    notFound();
  }

  if (actor.role !== "admin" && trip.operatorId !== actor.id) {
    notFound();
  }

  if (!isAderoTripStatus(trip.status)) {
    throw new Error("Unknown trip status: " + trip.status);
  }

  const [statusLogs, latestLocation, latestEta, activeSession, tripRatings, alreadyRated] = await Promise.all([
    db
      .select({
        id: aderoTripStatusLog.id,
        fromStatus: aderoTripStatusLog.fromStatus,
        toStatus: aderoTripStatusLog.toStatus,
        note: aderoTripStatusLog.note,
        createdAt: aderoTripStatusLog.createdAt,
        changedByFirstName: aderoUsers.firstName,
        changedByLastName: aderoUsers.lastName,
        changedByEmail: aderoUsers.email,
      })
      .from(aderoTripStatusLog)
      .innerJoin(aderoUsers, eq(aderoTripStatusLog.changedBy, aderoUsers.id))
      .where(eq(aderoTripStatusLog.tripId, trip.id))
      .orderBy(desc(aderoTripStatusLog.createdAt)),
    getLatestLocation(trip.id),
    getLatestEta(trip.id),
    getActiveTrackingSession(trip.id),
    getRatingsForTrip(trip.id),
    hasUserRatedTrip(trip.id, actor.id),
  ]);

  const statusStyle = TRIP_STATUS_STYLES[trip.status] ?? TRIP_STATUS_STYLES.assigned;
  const validNextStatuses = getValidTripTransitions(trip.status);
  const requestStatusLabel =
    ADERO_REQUEST_STATUS_LABELS[trip.requestStatus as AderoRequestStatus] ??
    trip.requestStatus;
  const serviceTypeLabel =
    ADERO_SERVICE_TYPE_LABELS[trip.requestServiceType as AderoServiceType] ??
    trip.requestServiceType;
  const isTripEnded = trip.status === "completed" || trip.status === "canceled";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/app/operator"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: "#475569" }}
          >
            \u2190 Back to operator dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            Trip #{trip.id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Manage lifecycle progression from assignment through completion.
          </p>
        </div>
        <span
          className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide"
          style={statusStyle}
        >
          {ADERO_TRIP_STATUS_LABELS[trip.status]}
        </span>
      </div>

      <TrackingStatusBar
        tripId={trip.id}
        tripStatus={trip.status}
        isTracking={Boolean(activeSession)}
        lastLocation={
          latestLocation
            ? {
                latitude: toNumber(latestLocation.latitude),
                longitude: toNumber(latestLocation.longitude),
                recordedAt: latestLocation.recordedAt.toISOString(),
              }
            : null
        }
        eta={
          latestEta
            ? {
                status: latestEta.status,
                estimatedDurationMinutes: latestEta.estimatedDurationMinutes,
                distanceRemainingMiles:
                  latestEta.distanceRemainingMiles === null
                    ? null
                    : toNumber(latestEta.distanceRemainingMiles),
              }
            : null
        }
      />

      {!isTripEnded && (
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
            Location Tracking
          </p>
          <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
            Share live operator location updates and ETA telemetry for this trip.
          </p>
          <div className="mt-4">
            <LocationTracker
              tripId={trip.id}
              tripStatus={trip.status}
              operatorUserId={trip.operatorId}
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
            Trip Info
          </p>
          <div className="mt-3 space-y-2 text-sm" style={{ color: "#cbd5e1" }}>
            <p>
              <span style={{ color: "#64748b" }}>Route:</span> {trip.pickupAddress}
              <span style={{ color: "#475569" }}> \u2192 </span>
              {trip.dropoffAddress}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Scheduled:</span> {fmtDatetime(trip.scheduledAt)}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Original request pickup:</span>{" "}
              {fmtDatetime(trip.requestPickupAt)}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Service type:</span> {serviceTypeLabel}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Request status:</span> {requestStatusLabel}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Started:</span> {fmtDatetime(trip.startedAt)}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Completed:</span> {fmtDatetime(trip.completedAt)}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Canceled:</span> {fmtDatetime(trip.canceledAt)}
            </p>
            {trip.cancelReason && (
              <p>
                <span style={{ color: "#64748b" }}>Cancel reason:</span> {trip.cancelReason}
              </p>
            )}
            <p>
              <span style={{ color: "#64748b" }}>Created:</span> {fmtDatetime(trip.createdAt)}
            </p>
          </div>
        </div>

        <TripStatusControls tripId={trip.id} nextStatuses={validNextStatuses} />
      </div>

      {trip.status === "completed" && !alreadyRated && (
        <RatingForm
          tripId={trip.id}
          rateeUserId={trip.requesterId}
          raterRole="operator"
          rateeLabel="the requester"
        />
      )}

      <RatingDisplay ratings={tripRatings} />

      <div
        className="rounded-xl border p-5"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Status Timeline
        </p>
        {statusLogs.length === 0 ? (
          <p className="mt-3 text-xs" style={{ color: "#64748b" }}>
            No status transitions recorded yet.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {statusLogs.map((entry) => {
              const toLabel = isAderoTripStatus(entry.toStatus)
                ? ADERO_TRIP_STATUS_LABELS[entry.toStatus]
                : entry.toStatus;
              const fromLabel = isAderoTripStatus(entry.fromStatus)
                ? ADERO_TRIP_STATUS_LABELS[entry.fromStatus]
                : entry.fromStatus;

              return (
                <div
                  key={entry.id}
                  className="rounded-lg border px-3 py-2"
                  style={{
                    borderColor: "rgba(255,255,255,0.08)",
                    background: "rgba(15,23,42,0.5)",
                  }}
                >
                  <p className="text-sm" style={{ color: "#e2e8f0" }}>
                    {fromLabel} \u2192 {toLabel}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: "#64748b" }}>
                    {fmtDatetime(entry.createdAt)} \u00b7 by{" "}
                    {actorName({
                      firstName: entry.changedByFirstName,
                      lastName: entry.changedByLastName,
                      email: entry.changedByEmail,
                    })}
                  </p>
                  {entry.note && (
                    <p className="mt-1 text-xs" style={{ color: "#94a3b8" }}>
                      {entry.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
