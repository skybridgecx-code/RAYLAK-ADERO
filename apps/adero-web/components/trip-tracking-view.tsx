"use client";

import { useEffect, useMemo, useState } from "react";
import { useTrackingSnapshot } from "@/hooks/use-tracking-snapshot";
import { useTrackingStream } from "@/hooks/use-tracking-stream";
import { EtaDisplay } from "./eta-display";

type TripTrackingViewProps = {
  tripId: string;
  pickupAddress: string;
  dropoffAddress: string;
  operatorName?: string | null;
};

const TRIP_STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  assigned: { bg: "rgba(99,102,241,0.16)", color: "#a5b4fc", label: "Assigned" },
  operator_en_route: { bg: "rgba(59,130,246,0.16)", color: "#93c5fd", label: "Operator en route" },
  operator_arrived: { bg: "rgba(20,184,166,0.16)", color: "#5eead4", label: "Operator arrived" },
  in_progress: { bg: "rgba(34,197,94,0.16)", color: "#86efac", label: "In progress" },
  completed: { bg: "rgba(34,197,94,0.2)", color: "#6ee7b7", label: "Completed" },
  canceled: { bg: "rgba(239,68,68,0.16)", color: "#fda4af", label: "Canceled" },
};

const GEOFENCE_LABELS: Record<string, string> = {
  entered_pickup_zone: "Operator approaching pickup",
  exited_pickup_zone: "Operator left pickup area",
  entered_dropoff_zone: "Operator approaching dropoff",
  exited_dropoff_zone: "Operator left dropoff area",
  entered_custom_zone: "Operator entered service zone",
};

function formatRelativeTime(value: string | Date): string {
  const timeMs = new Date(value).getTime();
  if (!Number.isFinite(timeMs)) return "Unknown";

  const deltaMs = Date.now() - timeMs;
  if (deltaMs < 10_000) return "just now";

  const sec = Math.floor(deltaMs / 1000);
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;

  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatClock(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function headingToCompass(heading: number | null | undefined): string {
  if (heading === null || heading === undefined || !Number.isFinite(heading)) return "—";
  const normalized = ((heading % 360) + 360) % 360;
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(normalized / 45) % 8;
  const direction = directions[index] ?? "N";
  return `${direction} (${Math.round(normalized)}°)`;
}

function toMph(speed: number | null | undefined): string {
  if (speed === null || speed === undefined || speed <= 0) return "—";
  return `${(speed * 2.237).toFixed(1)} mph`;
}

export function TripTrackingView({
  tripId,
  pickupAddress,
  dropoffAddress,
  operatorName,
}: TripTrackingViewProps) {
  const { snapshot, isLoading, error: snapshotError, refetch } = useTrackingSnapshot(tripId);
  const { trackingData, isConnected, error: streamError } = useTrackingStream(tripId);
  const [showAllTrail, setShowAllTrail] = useState(false);
  const [, setNowTick] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (trackingData?.type === "trip_ended") {
      void refetch();
    }
  }, [refetch, trackingData]);

  const liveUpdate = trackingData?.type === "tracking_update" ? trackingData : null;
  const tripStatus = trackingData?.tripStatus ?? snapshot?.tripStatus ?? "assigned";

  const location = liveUpdate ? (liveUpdate.location ?? null) : (snapshot?.location ?? null);
  const eta = liveUpdate ? (liveUpdate.eta ?? null) : (snapshot?.eta ?? null);
  const session = liveUpdate ? (liveUpdate.session ?? null) : (snapshot?.session ?? null);
  const isStale = liveUpdate ? Boolean(liveUpdate.isStale) : (snapshot?.isStale ?? true);
  const geofenceEvents = snapshot?.geofenceEvents ?? [];
  const trail = useMemo(() => {
    const points = [...(snapshot?.locationHistory ?? [])].sort((a, b) => {
      return new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime();
    });
    return points;
  }, [snapshot?.locationHistory]);

  const displayedTrail = showAllTrail ? trail : trail.slice(0, 10);
  const hasMoreTrail = trail.length > 10;

  const isEnded = tripStatus === "completed" || tripStatus === "canceled";
  const tripStatusStyle = TRIP_STATUS_STYLES[tripStatus] ?? {
    bg: "rgba(148,163,184,0.16)",
    color: "#cbd5e1",
    label: tripStatus,
  };

  const connectionState = isConnected
    ? { label: "Live", color: "#86efac", dot: "bg-emerald-300" }
    : streamError
      ? { label: "Disconnected", color: "#fda4af", dot: "bg-rose-300" }
      : { label: "Connecting...", color: "#fde68a", dot: "bg-yellow-300" };

  const topError = snapshotError ?? streamError;
  const lastUpdate = location?.recordedAt ? formatRelativeTime(location.recordedAt) : "—";
  const destinationTypeLabel =
    eta?.destinationType === "pickup"
      ? "Heading to pickup"
      : eta?.destinationType === "dropoff"
        ? "Heading to dropoff"
        : "Waiting for destination";

  if (isLoading && !snapshot && !trackingData) {
    return (
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
      >
        <p className="text-sm" style={{ color: "#94a3b8" }}>
          Loading trip tracking...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide"
              style={{ background: tripStatusStyle.bg, color: tripStatusStyle.color }}
            >
              {tripStatusStyle.label}
            </span>
            <span className="text-xs" style={{ color: "#64748b" }}>
              Trip {tripId.slice(0, 8)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${connectionState.dot}`} />
            <span className="text-xs font-medium" style={{ color: connectionState.color }}>
              {connectionState.label}
            </span>
          </div>
        </div>

        {isStale && location?.recordedAt && !isEnded && (
          <div
            className="mt-3 rounded-md border px-3 py-2 text-xs"
            style={{ borderColor: "rgba(250,204,21,0.35)", color: "#fde68a" }}
          >
            Operator location is stale — last update {formatRelativeTime(location.recordedAt)}.
          </div>
        )}

        {topError && (
          <div
            className="mt-3 rounded-md border px-3 py-2 text-xs"
            style={{ borderColor: "rgba(248,113,113,0.35)", color: "#fecaca" }}
          >
            {topError}
          </div>
        )}
      </div>

      {tripStatus === "completed" && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(74,222,128,0.35)", background: "rgba(34,197,94,0.12)", color: "#bbf7d0" }}
        >
          <p className="font-medium">Trip completed</p>
          <p className="mt-1 text-xs" style={{ color: "#86efac" }}>
            {session?.totalDistanceMiles !== null && session?.totalDistanceMiles !== undefined
              ? `Final distance traveled: ${session.totalDistanceMiles.toFixed(2)} miles`
              : "Final distance summary will be available soon."}
          </p>
        </div>
      )}

      {tripStatus === "canceled" && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(248,113,113,0.35)", background: "rgba(239,68,68,0.12)", color: "#fecaca" }}
        >
          <p className="font-medium">Trip was canceled</p>
        </div>
      )}

      {!isEnded && (
        <>
          <div className="space-y-3">
            {eta ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
                  ETA
                </p>
                <EtaDisplay
                  status={eta.status}
                  estimatedDurationMinutes={eta.estimatedDurationMinutes}
                  distanceRemainingMiles={eta.distanceRemainingMiles}
                  estimatedArrivalAt={eta.estimatedArrivalAt}
                  destinationType={eta.destinationType}
                />
                <p className="mt-2 text-xs" style={{ color: "#64748b" }}>
                  {destinationTypeLabel} · Arrival at {formatClock(eta.estimatedArrivalAt)}
                </p>
              </div>
            ) : (
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <p className="text-sm" style={{ color: "#cbd5e1" }}>
                  {location ? "Calculating route..." : "Waiting for operator to start tracking."}
                </p>
              </div>
            )}
          </div>

          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[2px] mb-2" style={{ color: "#475569" }}>
              Live Map
            </p>
            {/* TODO: Integrate map provider (Google Maps, Mapbox, Leaflet) here */}
            <div
              className="flex min-h-[300px] items-center justify-center rounded-lg border"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "linear-gradient(135deg, rgba(30,41,59,0.7), rgba(15,23,42,0.8))",
              }}
            >
              <div className="text-center">
                <p className="text-base font-medium" style={{ color: "#e2e8f0" }}>
                  Live map coming soon
                </p>
                <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
                  Operator coordinates are being tracked in real-time
                </p>
              </div>
            </div>
            {location && (
              <p className="mt-3 text-xs" style={{ color: "#94a3b8" }}>
                Operator position: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </p>
            )}
          </div>

          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
              Operator Location Details
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2" style={{ color: "#cbd5e1" }}>
              <p>
                <span style={{ color: "#64748b" }}>Coordinates:</span>{" "}
                {location
                  ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                  : "Waiting for GPS"}
              </p>
              <p>
                <span style={{ color: "#64748b" }}>Speed:</span>{" "}
                {location ? toMph(location.speed) : "—"}
              </p>
              <p>
                <span style={{ color: "#64748b" }}>Heading:</span>{" "}
                {location ? headingToCompass(location.heading) : "—"}
              </p>
              <p>
                <span style={{ color: "#64748b" }}>Accuracy:</span>{" "}
                {location?.accuracy !== null && location?.accuracy !== undefined
                  ? `${location.accuracy.toFixed(0)} m`
                  : "—"}
              </p>
              <p>
                <span style={{ color: "#64748b" }}>Last updated:</span> {lastUpdate}
              </p>
            </div>
          </div>
        </>
      )}

      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Trip Route
        </p>
        <div className="mt-3 space-y-2 text-sm" style={{ color: "#cbd5e1" }}>
          <p>
            <span style={{ color: "#64748b" }}>Pickup:</span> {pickupAddress}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Dropoff:</span> {dropoffAddress}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Operator:</span>{" "}
            {operatorName?.trim() ? operatorName : "Assigned operator"}
          </p>
        </div>
      </div>

      {!isEnded && (
        <>
          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
                Location Trail
              </p>
              {hasMoreTrail && (
                <button
                  type="button"
                  onClick={() => setShowAllTrail((v) => !v)}
                  className="text-xs font-medium"
                  style={{ color: "#a5b4fc" }}
                >
                  {showAllTrail ? "Show less" : "Show more"}
                </button>
              )}
            </div>

            {displayedTrail.length === 0 ? (
              <p className="mt-3 text-xs" style={{ color: "#64748b" }}>
                No location points yet.
              </p>
            ) : (
              <div className="mt-3 space-y-1">
                {displayedTrail.map((point) => (
                  <div
                    key={point.id}
                    className="grid grid-cols-[1fr_auto] gap-2 rounded-md border px-3 py-2 text-xs"
                    style={{
                      borderColor: "rgba(255,255,255,0.08)",
                      background: "rgba(15,23,42,0.45)",
                      color: "#cbd5e1",
                    }}
                  >
                    <p>
                      {formatRelativeTime(point.recordedAt)} · {point.latitude.toFixed(5)},{" "}
                      {point.longitude.toFixed(5)}
                    </p>
                    <p style={{ color: "#94a3b8" }}>{toMph(point.speed)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {geofenceEvents.length > 0 && (
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
                Geofence Events
              </p>
              <div className="mt-3 space-y-1">
                {geofenceEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-md border px-3 py-2 text-xs"
                    style={{
                      borderColor: "rgba(255,255,255,0.08)",
                      background: "rgba(15,23,42,0.45)",
                    }}
                  >
                    <p style={{ color: "#e2e8f0" }}>
                      {GEOFENCE_LABELS[event.eventType] ?? event.eventType}
                    </p>
                    <p style={{ color: "#64748b" }}>{formatRelativeTime(event.triggeredAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
