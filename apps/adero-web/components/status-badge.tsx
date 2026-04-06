import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from "~/lib/validators";

const STATUS_COLORS: Record<ApplicationStatus, { bg: string; color: string }> = {
  pending:   { bg: "rgba(99,102,241,0.15)",  color: "#818cf8" },  // indigo — new/unreviewed
  reviewing: { bg: "rgba(234,179,8,0.15)",   color: "#facc15" },  // yellow — in review
  approved:  { bg: "rgba(249,115,22,0.15)",  color: "#fb923c" },  // orange — approved, pending activation
  activated: { bg: "rgba(34,197,94,0.2)",    color: "#22c55e" },  // green  — live in network
  rejected:  { bg: "rgba(239,68,68,0.15)",   color: "#f87171" },  // red    — rejected
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as ApplicationStatus;
  const colors = STATUS_COLORS[s] ?? { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" };
  const label = APPLICATION_STATUS_LABELS[s] ?? status;

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: colors.bg, color: colors.color }}
    >
      {label}
    </span>
  );
}
