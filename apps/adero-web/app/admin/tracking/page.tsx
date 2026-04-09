import type { Metadata } from "next";
import Link from "next/link";
import {
  ADERO_TRIP_STATUS_LABELS,
  type AderoTripStatus,
} from "@raylak/db/schema";
import {
  getActiveTripsWithTracking,
  getAllOperatorLocations,
  getFleetOverview,
} from "./actions";

export const metadata: Metadata = {
  title: "Fleet Tracking - Adero Admin",
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
  if (!date) return "No update";
  const diff = Math.abs(Date.now() - date.getTime());
  if (diff < 86_400_000) {
    return formatRelative(date);
  }
  return formatAbsolute(date);
}

function toMph(speed: number | null): string {
  if (speed === null || speed <= 0) return "—";
  return `${(speed * 2.237).toFixed(1)} mph`;
}

function formatMiles(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)} mi`;
}

function statusLabel(status: string): string {
  const typed = status as AderoTripStatus;
  return ADERO_TRIP_STATUS_LABELS[typed] ?? status;
}

export default async function AdminTrackingDashboardPage() {
  const [overview, activeTrips, operatorLocations] = await Promise.all([
    getFleetOverview(),
    getActiveTripsWithTracking(),
    getAllOperatorLocations(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Fleet Tracking
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Live fleet visibility for active trips, tracking sessions, and operator last-known positions.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Trips", value: overview.activeTripsCount, color: "#cbd5e1" },
          { label: "Tracking Active", value: overview.trackingActiveCount, color: "#86efac" },
          { label: "Not Tracking", value: overview.withoutTrackingCount, color: "#fde68a" },
          { label: "Operators Online", value: overview.operatorsOnlineCount, color: "#93c5fd" },
          { label: "Stale Operators", value: overview.staleOperatorsCount, color: "#fda4af" },
          { label: "Location Updates Today", value: overview.locationUpdatesTodayCount, color: "#cbd5e1" },
          { label: "Geofence Events Today", value: overview.geofenceEventsTodayCount, color: "#cbd5e1" },
          {
            label: "Avg Session Duration",
            value: `${overview.averageTrackingSessionDurationMinutes.toFixed(1)} min`,
            color: "#a5b4fc",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border p-4"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-[1.5px]" style={{ color: "#64748b" }}>
              {item.label}
            </p>
            <p className="mt-1 text-2xl font-light" style={{ color: item.color }}>
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
      >
        <div className="border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
            Active Trips
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {[
                  "Trip ID",
                  "Status",
                  "Operator",
                  "Pickup",
                  "Dropoff",
                  "Tracking",
                  "ETA",
                  "Distance",
                  "Last Update",
                  "Actions",
                ].map((label) => (
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
              {activeTrips.map((trip) => {
                const tripStyle = TRIP_STATUS_STYLES[trip.tripStatus] ?? {
                  bg: "rgba(148,163,184,0.15)",
                  color: "#cbd5e1",
                };

                const etaStyle =
                  (trip.latestEta && ETA_STATUS_STYLES[trip.latestEta.status]) ?? {
                    bg: "rgba(148,163,184,0.12)",
                    color: "#94a3b8",
                  };

                const hasTracking = Boolean(trip.activeSession);
                const lastUpdate = trip.latestLocation?.updatedAt ?? null;

                return (
                  <tr
                    key={trip.tripId}
                    className="border-b align-top last:border-b-0"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: "#cbd5e1" }}>
                      {trip.tripId.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                        style={{ background: tripStyle.bg, color: tripStyle.color }}
                      >
                        {statusLabel(trip.tripStatus)}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {trip.operatorEmail}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {trip.pickupAddress}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {trip.dropoffAddress}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                        style={{
                          background: hasTracking ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                          color: hasTracking ? "#86efac" : "#fda4af",
                        }}
                      >
                        {hasTracking ? "✓ Active" : "✗ Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {trip.latestEta ? (
                        <div className="space-y-1">
                          <span
                            className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                            style={{ background: etaStyle.bg, color: etaStyle.color }}
                          >
                            {trip.latestEta.status}
                          </span>
                          <p className="text-xs" style={{ color: "#94a3b8" }}>
                            {trip.latestEta.estimatedDurationMinutes ?? "—"} min
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "#64748b" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                      {formatMiles(trip.latestEta?.distanceRemainingMiles ?? null)}
                    </td>
                    <td
                      className="px-3 py-2 text-xs"
                      style={{ color: trip.isLocationStale ? "#fda4af" : "#94a3b8" }}
                    >
                      {formatSmartTime(lastUpdate)}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/tracking/${trip.tripId}`}
                        className="text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ color: "#a5b4fc" }}
                      >
                        View Detail →
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {activeTrips.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-sm" style={{ color: "#64748b" }}>
                    No active trips right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
      >
        <div className="border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
            All Operator Last-Known Positions
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {[
                  "Operator",
                  "Latitude",
                  "Longitude",
                  "Speed",
                  "Active Trip",
                  "Last Updated",
                  "Status",
                ].map((label) => (
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
              {operatorLocations.map((row) => (
                <tr
                  key={row.operatorUserId}
                  className="border-b last:border-b-0"
                  style={{
                    borderColor: "rgba(255,255,255,0.06)",
                    background: row.isStale ? "rgba(239,68,68,0.04)" : "transparent",
                  }}
                >
                  <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                    {row.operatorEmail}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: "#94a3b8" }}>
                    {row.latitude.toFixed(5)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: "#94a3b8" }}>
                    {row.longitude.toFixed(5)}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                    {toMph(row.speed)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.activeTripId ? (
                      <Link
                        href={`/admin/tracking/${row.activeTripId}`}
                        className="font-medium transition-opacity hover:opacity-80"
                        style={{ color: "#a5b4fc" }}
                      >
                        {row.activeTripId.slice(0, 8)}
                      </Link>
                    ) : (
                      <span style={{ color: "#64748b" }}>None</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                    {formatSmartTime(row.updatedAt)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                      style={{
                        background: row.isStale ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
                        color: row.isStale ? "#fda4af" : "#86efac",
                      }}
                    >
                      {row.isStale ? "Stale" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}

              {operatorLocations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm" style={{ color: "#64748b" }}>
                    No operator location records yet.
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
