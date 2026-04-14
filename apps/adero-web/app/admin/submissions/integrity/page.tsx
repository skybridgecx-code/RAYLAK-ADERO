import type { Metadata } from "next";
import Link from "next/link";
import { loadChainIntegrityReport } from "~/lib/chain-integrity";
import {
  MEMBER_DOCUMENT_TYPE_LABELS,
  type MemberDocumentType,
} from "~/lib/validators";

export const metadata: Metadata = {
  title: "Chain Integrity - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTimestamp(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function docLabel(documentType: string): string {
  return (
    MEMBER_DOCUMENT_TYPE_LABELS[documentType as MemberDocumentType] ??
    documentType
  );
}

function memberTypePill(memberType: string) {
  const isCompany = memberType === "company";
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={
        isCompany
          ? { background: "rgba(99,102,241,0.1)", color: "#818cf8" }
          : { background: "rgba(20,184,166,0.1)", color: "#2dd4bf" }
      }
    >
      {isCompany ? "Company" : "Operator"}
    </span>
  );
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", bg: "rgba(234,179,8,0.12)", color: "#facc15" },
  accepted: { label: "Accepted", bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  rejected: { label: "Rejected", bg: "rgba(239,68,68,0.12)", color: "#f87171" },
  needs_follow_up: { label: "Needs Follow-Up", bg: "rgba(249,115,22,0.12)", color: "#fb923c" },
  reviewed: { label: "Accepted", bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  dismissed: { label: "Rejected", bg: "rgba(239,68,68,0.12)", color: "#f87171" },
};

function statusPill(status: string) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES["pending"]!;
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ChainIntegrityPage() {
  const report = await loadChainIntegrityReport();
  const { stalePending, multiPendingLanes, crossLane, totalAnomalies } = report;

  const isHealthy = totalAnomalies === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs mb-3" style={{ color: "#64748b" }}>
            <Link href="/admin/submissions" className="transition-opacity hover:opacity-70">
              ← Submission Inbox
            </Link>
          </div>
          <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            Chain Integrity
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#475569" }}>
            Detected anomalies in portal submission chain structure.
          </p>
        </div>
      </div>

      {/* Status banner */}
      {isHealthy ? (
        <div
          className="rounded-xl border px-5 py-4 flex items-center gap-3"
          style={{ borderColor: "rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.05)" }}
        >
          <span className="text-lg" aria-hidden>●</span>
          <div>
            <p className="text-sm font-medium" style={{ color: "#4ade80" }}>
              All chains healthy
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
              No stale pending submissions, multi-head lanes, or cross-lane supersessions detected.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl border px-5 py-4 flex items-center gap-3"
          style={{ borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.05)" }}
        >
          <span className="text-lg" aria-hidden>▲</span>
          <div>
            <p className="text-sm font-medium" style={{ color: "#fb923c" }}>
              {totalAnomalies} chain anomal{totalAnomalies === 1 ? "y" : "ies"} detected
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
              Review the sections below and follow the chain timeline links to investigate each issue.
            </p>
          </div>
        </div>
      )}

      {/* Summary grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Stale Pending",
            value: stalePending.length,
            description: "Pending submissions superseded and unresolvable",
            alertColor: stalePending.length > 0 ? "#fb923c" : "#334155",
          },
          {
            label: "Multi-Head Lanes",
            value: multiPendingLanes.length,
            description: "Lanes with multiple concurrent pending heads",
            alertColor: multiPendingLanes.length > 0 ? "#facc15" : "#334155",
          },
          {
            label: "Cross-Lane Links",
            value: crossLane.length,
            description: "Supersession links crossing member or document lane",
            alertColor: crossLane.length > 0 ? "#f87171" : "#334155",
          },
        ].map(({ label, value, description, alertColor }) => (
          <div
            key={label}
            className="rounded-xl border p-4"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-2xl font-light tabular-nums" style={{ color: alertColor }}>
              {value}
            </p>
            <p className="mt-0.5 text-xs font-medium" style={{ color: "#94a3b8" }}>
              {label}
            </p>
            <p className="mt-1 text-[11px]" style={{ color: "#334155" }}>
              {description}
            </p>
          </div>
        ))}
      </div>

      {/* ── Section 1: Stale Pending ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium" style={{ color: "#e2e8f0" }}>
            Stale Pending Submissions
          </h2>
          <p className="mt-1 text-xs" style={{ color: "#475569" }}>
            These submissions have status <span style={{ color: "#facc15" }}>pending</span> but
            have been superseded by a newer submission. The admin review guard blocks them from
            being reviewed. They require manual investigation.
          </p>
        </div>

        {stalePending.length === 0 ? (
          <div
            className="rounded-xl border px-5 py-6 text-center"
            style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
          >
            <p className="text-sm" style={{ color: "#334155" }}>
              No stale pending submissions.
            </p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-xl border divide-y"
            style={{
              borderColor: "rgba(249,115,22,0.2)",
              background: "rgba(249,115,22,0.02)",
            }}
          >
            {stalePending.map((row) => (
              <div
                key={row.submissionId}
                className="px-5 py-4"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {memberTypePill(row.memberType)}
                  <span className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
                    {row.memberName}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                  >
                    {docLabel(row.documentType)}
                  </span>
                  {statusPill("pending")}
                  <span className="ml-auto text-[11px]" style={{ color: "#475569" }}>
                    {fmtTimestamp(row.createdAt)}
                  </span>
                </div>

                <div className="mt-2 space-y-0.5">
                  <p className="text-[11px] font-mono" style={{ color: "#64748b" }}>
                    Stale submission: {row.submissionId}
                  </p>
                  <p className="text-[11px] font-mono" style={{ color: "#64748b" }}>
                    Superseded by:{" "}
                    <span style={{ color: "#94a3b8" }}>{row.successorId}</span>
                    {" "}({STATUS_STYLES[row.successorStatus]?.label ?? row.successorStatus})
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={`/admin/submissions/${row.submissionId}`}
                    className="text-[11px] transition-opacity hover:opacity-70"
                    style={{ color: "#818cf8" }}
                  >
                    View stale submission chain →
                  </Link>
                  <Link
                    href={`/admin/submissions/${row.successorId}`}
                    className="text-[11px] transition-opacity hover:opacity-70"
                    style={{ color: "#64748b" }}
                  >
                    View successor chain →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2: Multiple Pending Heads ──────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium" style={{ color: "#e2e8f0" }}>
            Multiple Pending Heads per Lane
          </h2>
          <p className="mt-1 text-xs" style={{ color: "#475569" }}>
            A lane (member × document type) should have at most one pending chain head.
            Multiple heads indicate that the portal submission guard was bypassed.
          </p>
        </div>

        {multiPendingLanes.length === 0 ? (
          <div
            className="rounded-xl border px-5 py-6 text-center"
            style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
          >
            <p className="text-sm" style={{ color: "#334155" }}>
              No lanes with multiple pending heads.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {multiPendingLanes.map((lane) => (
              <div
                key={`${lane.memberType}|${lane.profileId}|${lane.documentType}`}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: "rgba(234,179,8,0.2)", background: "rgba(234,179,8,0.02)" }}
              >
                <div
                  className="px-5 py-3 border-b flex flex-wrap items-center gap-2"
                  style={{ borderColor: "rgba(234,179,8,0.15)" }}
                >
                  {memberTypePill(lane.memberType)}
                  <span className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
                    {lane.memberName}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                  >
                    {docLabel(lane.documentType)}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: "rgba(234,179,8,0.15)", color: "#facc15" }}
                  >
                    {lane.heads.length} pending heads
                  </span>
                </div>

                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {lane.heads.map((head) => (
                    <div key={head.submissionId} className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-mono" style={{ color: "#64748b" }}>
                          {head.submissionId}
                        </p>
                        <span className="text-[11px]" style={{ color: "#475569" }}>
                          {fmtTimestamp(head.createdAt)}
                        </span>
                        <Link
                          href={`/admin/submissions/${head.submissionId}`}
                          className="text-[11px] transition-opacity hover:opacity-70"
                          style={{ color: "#818cf8" }}
                        >
                          View chain →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 3: Cross-Lane Supersessions ────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium" style={{ color: "#e2e8f0" }}>
            Cross-Lane Supersessions
          </h2>
          <p className="mt-1 text-xs" style={{ color: "#475569" }}>
            A submission&apos;s supersession link points to a submission in a different
            member, profile, or document type lane. This indicates a data integrity
            error and should be investigated immediately.
          </p>
        </div>

        {crossLane.length === 0 ? (
          <div
            className="rounded-xl border px-5 py-6 text-center"
            style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
          >
            <p className="text-sm" style={{ color: "#334155" }}>
              No cross-lane supersessions detected.
            </p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-xl border divide-y"
            style={{
              borderColor: "rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.03)",
            }}
          >
            {crossLane.map((row) => (
              <div
                key={row.submissionId}
                className="px-5 py-4"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {memberTypePill(row.memberType)}
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                  >
                    {docLabel(row.documentType)}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
                  >
                    Cross-lane link
                  </span>
                </div>

                <div className="mt-2 space-y-0.5">
                  <p className="text-[11px] font-mono" style={{ color: "#64748b" }}>
                    Submission: {row.submissionId}
                    {" "}({row.memberType} / {docLabel(row.documentType)})
                  </p>
                  <p className="text-[11px] font-mono" style={{ color: "#64748b" }}>
                    Supersedes:{" "}
                    <span style={{ color: "#f87171" }}>{row.parentId}</span>
                    {" "}({row.parentMemberType} / {docLabel(row.parentDocumentType)})
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={`/admin/submissions/${row.submissionId}`}
                    className="text-[11px] transition-opacity hover:opacity-70"
                    style={{ color: "#818cf8" }}
                  >
                    View submission chain →
                  </Link>
                  <Link
                    href={`/admin/submissions/${row.parentId}`}
                    className="text-[11px] transition-opacity hover:opacity-70"
                    style={{ color: "#64748b" }}
                  >
                    View parent chain →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
