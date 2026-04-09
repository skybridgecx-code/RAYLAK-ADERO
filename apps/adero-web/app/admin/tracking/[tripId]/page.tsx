import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ADERO_TRIP_STATUS_LABELS,
  type AderoTripStatus,
} from "@raylak/db/schema";
import { getTripTrackingDetail } from "../actions";

export const metadata: Metadata = {
  title: "Trip Tracking Detail - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const TRIP_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  assigned: { bg: "rgba(99,102,241,0.15)", color: "#a5b4fc" },
  operator_en_route: { bg: "rgba(59,130,246,0.15)", color: "#93c5fd" },
  operator_arrived: { bg: "rgba(20,184,166,0.16)", color: "#5eead4" },
  in_progress: { bg: "rgba(34,197,94,0.16)", color: "#86efac" },
  completed: { bg: "rgba(34,197,94,0.16)", color: "#86efac" },
  canceled: { bg: "rgba(239,68,68,0.16)", color: "#fda4af" },
};

const ETA_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  on_track: { bg: "rgba(34,197,94,0.16)", color: "#86efac" },
  delayed: { bg: "rgba(234,179,8,0.16)", color: "#fde68a" },
  arrived: { bg: "rgba(16,185,129,0.2)", color: "#6ee7b7" },
  calculating: { bg: "rgba(148,163,184,0.16)", color: "#cbd5e1" },
  unavailable: { bg: "rgba(148,163,184,0.12)", color: "#94a3b8" },
};

const GEOFENCE_LABELS: Record<string, string> = {
  entered_pickup_zone: "Operator approaching pickup",
  exited_pickup_zone: "Operator left pickup area",
  entered_dropoff_zone: "Operator approaching dropoff",
  exited_dropoff_zone: "Operator left dropoff area",
  entered_custom_zone: "Operator entered custom geofence zone",
};

function formatAbsolute(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatSmartTime(date: Date | null): string {
  if (!date) return "—";
  const diff = Math.abs(Date.now() - date.getTime());
  if (diff < 86_400_000) {
    return `${formatRelative(date)} (${formatAbsolute(date)})`;
  }
  return formatAbsolute(date);
}

function statusLabel(status: string): string {
  const typed = status as AderoTripStatus;
  return ADERO_TRIP_STATUS_LABELS[typed] ?? status;
}

function toMph(speed: number | null): string {
  if (speed === null || speed <= 0) return "—";
  return `${(speed * 2.237).toFixed(1)} mph`;
}

function formatMiles(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(2)} mi`;
}

function formatCompass(heading: number | null): string {
  if (heading === null) return "—";
  const normalized = ((heading % 360) + 360) % 360;
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  const index = Math.round(normalized / 45) % 8;
  const direction = directions[index] ?? "N";
  return `${direction} (${Math.round(normalized)}°)`;
}

export default async function AdminTripTrackingDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  let detail: Awaited<ReturnType<typeof getTripTrackingDetail>>;
  try {
    detail = await getTripTrackingDetail(tripId);
  } catch (error) {
    if (error instanceof Error && error.message === "Trip not found.") {
      notFound();
    }
    throw error;
  }

  const tripStatusStyle = TRIP_STATUS_STYLES[detail.trip.tripStatus] ?? {
    bg: "rgba(148,163,184,0.15)",
    color: "#cbd5e1",
  };

  const etaHistoryChronological = [...detail.etaHistory].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const locationHistoryNewestFirst = [...detail.locationHistory].sort(
    (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
  );

  const trackingSession = detail.trackingSession;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/tracking"
            className="text-xs transition-opacity hover:opacity-80"
            style={{ color: "#64748b" }}
          >
            ← Back to fleet tracking
          </Link>
          <h1 className="mt-2 text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            Trip {detail.trip.tripId.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            {detail.trip.operatorEmail} · {detail.trip.pickupAddress} → {detail.trip.dropoffAddress}
          </p>
        </div>

        <span
          className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide"
          style={{ background: tripStatusStyle.bg, color: tripStatusStyle.color }}
        >
          {statusLabel(detail.trip.tripStatus)}
        </span>
      </div>

      <section
        className="rounded-xl border p-5"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Current State
        </h2>

        {detail.latestLocation ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div
              className="rounded-lg border p-3"
              style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(15,23,42,0.45)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-[1.5px]" style={{ color: "#64748b" }}>
                Latest Location
              </p>
              <div className="mt-2 space-y-1 text-sm" style={{ color: "#cbd5e1" }}>
                <p>Lat: {detail.latestLocation.latitude.toFixed(5)}</p>
                <p>Lng: {detail.latestLocation.longitude.toFixed(5)}</p>
                <p>Speed: {toMph(detail.latestLocation.speed)}</p>
                <p>Heading: {formatCompass(detail.latestLocation.heading)}</p>
                <p>
                  Accuracy:{" "}
                  {detail.latestLocation.accuracy === null
                    ? "—"
                    : `${detail.latestLocation.accuracy.toFixed(0)} m`}
                </p>
                <p>Recorded: {formatSmartTime(detail.latestLocation.recordedAt)}</p>
              </div>
            </div>

            <div
              className="rounded-lg border p-3"
              style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(15,23,42,0.45)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-[1.5px]" style={{ color: "#64748b" }}>
                Latest ETA
              </p>
              {detail.latestEta ? (
                <div className="mt-2 space-y-1 text-sm" style={{ color: "#cbd5e1" }}>
                  <span
                    className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                    style={{
                      background: ETA_STATUS_STYLES[detail.latestEta.status]?.bg ?? "rgba(148,163,184,0.12)",
                      color: ETA_STATUS_STYLES[detail.latestEta.status]?.color ?? "#94a3b8",
                    }}
                  >
                    {detail.latestEta.status}
                  </span>
                  <p>Duration: {detail.latestEta.estimatedDurationMinutes ?? "—"} min</p>
                  <p>Distance: {formatMiles(detail.latestEta.distanceRemainingMiles)}</p>
                  <p>Destination: {detail.latestEta.destinationType}</p>
                  <p>Updated: {formatSmartTime(detail.latestEta.createdAt)}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm" style={{ color: "#64748b" }}>
                  ETA not available.
                </p>
              )}
            </div>

            <div
              className="rounded-lg border p-3"
              style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(15,23,42,0.45)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-[1.5px]" style={{ color: "#64748b" }}>
                Tracking Session
              </p>
              {trackingSession ? (
                <div className="mt-2 space-y-1 text-sm" style={{ color: "#cbd5e1" }}>
                  <p>
                    Status:{" "}
                    <span style={{ color: trackingSession.isActive ? "#86efac" : "#fbbf24" }}>
                      {trackingSession.isActive ? "Active" : "Ended"}
                    </span>
                  </p>
                  <p>Started: {formatSmartTime(trackingSession.startedAt)}</p>
                  <p>Ended: {formatSmartTime(trackingSession.endedAt)}</p>
                  <p>Location count: {trackingSession.locationCount}</p>
                  <p>Total distance: {formatMiles(trackingSession.totalDistanceMiles)}</p>
                  <p>
                    Average speed:{" "}
                    {trackingSession.averageSpeedMph === null
                      ? "—"
                      : `${trackingSession.averageSpeedMph.toFixed(1)} mph`}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm" style={{ color: "#64748b" }}>
                  No tracking session data yet.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm" style={{ color: "#64748b" }}>
            No location data yet.
          </p>
        )}
      </section>

      <section
        className="rounded-xl border p-5"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          ETA History Timeline
        </h2>

        {etaHistoryChronological.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "#64748b" }}>
            No ETA history for this trip.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {etaHistoryChronological.map((eta, index) => {
              const prev = index > 0 ? etaHistoryChronological[index - 1] : null;
              const statusChanged = prev ? prev.status !== eta.status : false;
              const etaStyle = ETA_STATUS_STYLES[eta.status] ?? {
                bg: "rgba(148,163,184,0.12)",
                color: "#94a3b8",
              };

              return (
                <div
                  key={eta.id}
                  className="rounded-lg border px-3 py-2"
                  style={{
                    borderColor: statusChanged ? "rgba(250,204,21,0.35)" : "rgba(255,255,255,0.08)",
                    background: "rgba(15,23,42,0.45)",
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                      style={{ background: etaStyle.bg, color: etaStyle.color }}
                    >
                      {eta.status}
                    </span>
                    {statusChanged && (
                      <span className="text-[11px] font-semibold uppercase" style={{ color: "#fde68a" }}>
                        Status changed
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "#64748b" }}>
                      {formatSmartTime(eta.createdAt)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs" style={{ color: "#cbd5e1" }}>
                    {eta.estimatedDurationMinutes ?? "—"} min · {formatMiles(eta.distanceRemainingMiles)}
                    {" "}remaining · destination: {eta.destinationType}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section
        className="rounded-xl border p-5"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Geofence Events
        </h2>

        {detail.geofenceEvents.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "#64748b" }}>
            No geofence events recorded.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {detail.geofenceEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(15,23,42,0.45)" }}
              >
                <p className="text-sm" style={{ color: "#e2e8f0" }}>
                  {GEOFENCE_LABELS[event.eventType] ?? event.eventType}
                </p>
                <p className="text-xs" style={{ color: "#64748b" }}>
                  {formatSmartTime(event.triggeredAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
      >
        <div className="border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
            Location History (Last 100)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {["Time", "Latitude", "Longitude", "Speed", "Heading", "Accuracy"].map((label) => (
                  <th
                    key={label}
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[1.5px]"
                    style={{ color: "#64748b" }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {locationHistoryNewestFirst.map((point) => (
                <tr
                  key={point.id}
                  className="border-b last:border-b-0"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                    {formatSmartTime(point.recordedAt)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: "#94a3b8" }}>
                    {point.latitude.toFixed(5)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: "#94a3b8" }}>
                    {point.longitude.toFixed(5)}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                    {toMph(point.speed)}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                    {formatCompass(point.heading)}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                    {point.accuracy === null ? "—" : `${point.accuracy.toFixed(0)} m`}
                  </td>
                </tr>
              ))}

              {locationHistoryNewestFirst.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm" style={{ color: "#64748b" }}>
                    No location points available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
