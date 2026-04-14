"use client";

type EtaDisplayProps = {
  status: string;
  estimatedDurationMinutes: number | null;
  distanceRemainingMiles: number | null;
  estimatedArrivalAt: string | null;
  destinationType: string | null;
};

const ETA_STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  on_track: {
    bg: "rgba(34,197,94,0.16)",
    color: "#86efac",
    label: "On track",
  },
  delayed: {
    bg: "rgba(250,204,21,0.16)",
    color: "#fde68a",
    label: "Delayed",
  },
  arrived: {
    bg: "rgba(16,185,129,0.2)",
    color: "#6ee7b7",
    label: "Arrived",
  },
  calculating: {
    bg: "rgba(148,163,184,0.16)",
    color: "#cbd5e1",
    label: "Calculating",
  },
  unavailable: {
    bg: "rgba(148,163,184,0.12)",
    color: "#94a3b8",
    label: "Unavailable",
  },
};

const DEFAULT_ETA_STYLE = {
  bg: "rgba(148,163,184,0.12)",
  color: "#94a3b8",
  label: "Unavailable",
} as const;

function formatArrival(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EtaDisplay({
  status,
  estimatedDurationMinutes,
  distanceRemainingMiles,
  estimatedArrivalAt,
  destinationType,
}: EtaDisplayProps) {
  const styles = ETA_STATUS_STYLES[status] ?? ETA_STATUS_STYLES["unavailable"] ?? DEFAULT_ETA_STYLE;
  const durationText =
    estimatedDurationMinutes === null ? "—" : `${Math.max(0, estimatedDurationMinutes)} min`;
  const distanceText =
    distanceRemainingMiles === null ? "—" : `${distanceRemainingMiles.toFixed(1)} mi remaining`;

  const destinationLabel =
    destinationType === "pickup"
      ? "To pickup"
      : destinationType === "dropoff"
        ? "To dropoff"
        : "Route pending";

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[2px]" style={{ color: "#64748b" }}>
            Estimated Arrival
          </p>
          <p className="mt-1 text-3xl font-semibold" style={{ color: "#f8fafc" }}>
            {durationText}
          </p>
          <p className="mt-0.5 text-sm" style={{ color: "#94a3b8" }}>
            {distanceText}
          </p>
        </div>
        <span
          className={`rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
            status === "arrived" ? "animate-pulse" : ""
          }`}
          style={{ background: styles.bg, color: styles.color }}
        >
          {styles.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "#cbd5e1" }}>
        <p>
          <span style={{ color: "#64748b" }}>Destination:</span> {destinationLabel}
        </p>
        <p>
          <span style={{ color: "#64748b" }}>Arrival time:</span> {formatArrival(estimatedArrivalAt)}
        </p>
      </div>
    </div>
  );
}
