import {
  APPLICATION_STATUS_LABELS,
  COMPLIANCE_ESCALATION_STATUS_LABELS,
  MEMBER_DOCUMENT_COMPLIANCE_ACTION_LABELS,
  MEMBER_DOCUMENT_STATUS_LABELS,
  PROFILE_STATUS_LABELS,
  type ApplicationStatus,
  type ComplianceEscalationStatus,
  type MemberDocumentComplianceAction,
  type MemberDocumentDisplayStatus,
  type ProfileStatus,
} from "~/lib/validators";

const STATUS_COLORS: Record<
  | ApplicationStatus
  | ProfileStatus
  | MemberDocumentDisplayStatus
  | MemberDocumentComplianceAction
  | ComplianceEscalationStatus,
  { bg: string; color: string }
> = {
  pending: { bg: "rgba(99,102,241,0.15)", color: "#818cf8" }, // indigo — new/unreviewed
  reviewing: { bg: "rgba(234,179,8,0.15)", color: "#facc15" }, // yellow — in review
  approved: { bg: "rgba(249,115,22,0.15)", color: "#fb923c" }, // orange — approved, pending activation
  activated: { bg: "rgba(34,197,94,0.2)", color: "#22c55e" }, // green  — live in network
  rejected: { bg: "rgba(239,68,68,0.15)", color: "#f87171" }, // red    — rejected
  active: { bg: "rgba(34,197,94,0.2)", color: "#22c55e" },
  paused: { bg: "rgba(234,179,8,0.15)", color: "#facc15" },
  inactive: { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" },
  missing: { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" },
  expiring_soon: { bg: "rgba(249,115,22,0.15)", color: "#fb923c" },
  pending_review: { bg: "rgba(234,179,8,0.15)", color: "#facc15" },
  expired: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  follow_up_needed: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  reminder_sent: { bg: "rgba(249,115,22,0.15)", color: "#fb923c" },
  exception_noted: { bg: "rgba(99,102,241,0.15)", color: "#818cf8" },
  resolved: { bg: "rgba(34,197,94,0.2)", color: "#22c55e" },
  normal: { bg: "rgba(148,163,184,0.12)", color: "#64748b" },
  escalated: { bg: "rgba(239,68,68,0.2)", color: "#f87171" },
  resolved_after_escalation: { bg: "rgba(34,197,94,0.15)", color: "#4ade80" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as
    | ApplicationStatus
    | ProfileStatus
    | MemberDocumentDisplayStatus
    | MemberDocumentComplianceAction
    | ComplianceEscalationStatus;
  const colors = STATUS_COLORS[s] ?? { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" };
  const label =
    APPLICATION_STATUS_LABELS[s as ApplicationStatus] ??
    PROFILE_STATUS_LABELS[s as ProfileStatus] ??
    MEMBER_DOCUMENT_STATUS_LABELS[s as MemberDocumentDisplayStatus] ??
    MEMBER_DOCUMENT_COMPLIANCE_ACTION_LABELS[s as MemberDocumentComplianceAction] ??
    COMPLIANCE_ESCALATION_STATUS_LABELS[s as ComplianceEscalationStatus] ??
    status;

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: colors.bg, color: colors.color }}
    >
      {label}
    </span>
  );
}
