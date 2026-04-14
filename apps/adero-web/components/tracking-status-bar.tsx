"use client";

type TrackingStatusBarProps = {
  tripId: string;
  isTracking: boolean;
  lastLocation: { latitude: number; longitude: number; recordedAt: string } | null;
  eta: {
    status: string;
    estimatedDurationMinutes: number | null;
    distanceRemainingMiles: number | null;
  } | null;
  tripStatus?: string;
};

function formatRelativeTime(dateInput: string): string {
  const timestamp = new Date(dateInput).getTime();
  if (!Number.isFinite(timestamp)) return "Unknown";

  const deltaMs = Date.now() - timestamp;
  if (deltaMs < 10_000) return "Just now";

  const sec = Math.floor(deltaMs / 1000);
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function statusStyles(isTracking: boolean, tripStatus?: string) {
  const tripEnded = tripStatus === "completed" || tripStatus === "canceled";
  if (tripEnded) {
    return {
      bg: "rgba(148,163,184,0.12)",
      border: "rgba(148,163,184,0.25)",
      text: "#cbd5e1",
      dot: "bg-slate-400",
      label: "Trip ended",
    };
  }

  if (isTracking) {
    return {
      bg: "rgba(34,197,94,0.12)",
      border: "rgba(74,222,128,0.4)",
      text: "#86efac",
      dot: "bg-emerald-300",
      label: "Tracking active",
    };
  }

  return {
    bg: "rgba(250,204,21,0.12)",
    border: "rgba(253,224,71,0.35)",
    text: "#fde68a",
    dot: "bg-yellow-300",
    label: "Not tracking",
  };
}

export function TrackingStatusBar({
  tripId,
  isTracking,
  lastLocation,
  eta,
  tripStatus,
}: TrackingStatusBarProps) {
  const styles = statusStyles(isTracking, tripStatus);
  const lastUpdated = lastLocation ? formatRelativeTime(lastLocation.recordedAt) : "No updates";

  return (
    <div
      className="rounded-lg border px-3 py-2"
      style={{
        background: styles.bg,
        borderColor: styles.border,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${styles.dot}`} />
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: styles.text }}>
            {styles.label}
          </p>
          <p className="truncate text-[11px]" style={{ color: "#94a3b8" }}>
            Trip {tripId.slice(0, 8)}
          </p>
        </div>

        <p className="text-xs" style={{ color: "#cbd5e1" }}>
          {eta
            ? `ETA: ${eta.estimatedDurationMinutes ?? "—"} min · ${
                eta.distanceRemainingMiles === null ? "—" : `${eta.distanceRemainingMiles.toFixed(1)} mi`
              } remaining`
            : "ETA unavailable"}
        </p>

        <p className="text-[11px]" style={{ color: "#94a3b8" }}>
          Last update: {lastUpdated}
        </p>
      </div>
    </div>
  );
}
