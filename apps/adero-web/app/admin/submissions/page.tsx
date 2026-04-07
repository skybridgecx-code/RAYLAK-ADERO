import type { Metadata } from "next";
import Link from "next/link";
import {
  ADERO_PORTAL_SUBMISSION_STATUSES,
  aderoCompanyProfiles,
  aderoOperatorProfiles,
  aderoPortalSubmissions,
  db,
} from "@raylak/db";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { createPresignedGet } from "~/lib/s3";
import {
  MEMBER_DOCUMENT_TYPE_LABELS,
  MEMBER_DOCUMENT_TYPES,
  type MemberDocumentType,
} from "~/lib/validators";
import { reviewPortalSubmission } from "../profiles/portal-submission-actions";

export const metadata: Metadata = {
  title: "Submission Inbox - Adero Admin",
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

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_STYLES = {
  pending: { label: "Pending", bg: "rgba(234,179,8,0.12)", color: "#facc15" },
  accepted: { label: "Accepted", bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  rejected: { label: "Rejected", bg: "rgba(239,68,68,0.12)", color: "#f87171" },
  needs_follow_up: { label: "Needs Follow-Up", bg: "rgba(249,115,22,0.12)", color: "#fb923c" },
  // Legacy statuses kept for backward-compatible rendering before migration runs.
  reviewed: { label: "Accepted", bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  dismissed: { label: "Rejected", bg: "rgba(239,68,68,0.12)", color: "#f87171" },
} as const;

type KnownStatus = keyof typeof STATUS_STYLES;
const supersedingSubmissions = alias(aderoPortalSubmissions, "superseding_submissions");
const STATUS_FILTER_VALUES = [...ADERO_PORTAL_SUBMISSION_STATUSES, "all"] as const;
type StatusFilter = (typeof STATUS_FILTER_VALUES)[number];

function parseStatusFilter(value: string | undefined): StatusFilter {
  return STATUS_FILTER_VALUES.includes(value as StatusFilter)
    ? (value as StatusFilter)
    : "pending";
}

function filterValuesForStatus(status: Exclude<StatusFilter, "all">): string[] {
  if (status === "accepted") return ["accepted", "reviewed"];
  if (status === "rejected") return ["rejected", "dismissed"];
  return [status];
}

function statusStyle(status: string) {
  return status in STATUS_STYLES
    ? STATUS_STYLES[status as KnownStatus]
    : STATUS_STYLES.pending;
}

function reviewContextPrefix(status: string) {
  if (status === "accepted" || status === "reviewed") return "Accepted";
  if (status === "rejected" || status === "dismissed") return "Rejected";
  if (status === "needs_follow_up") return "Needs follow-up";
  return "Reviewed";
}

function isFollowUpOutcomeStatus(status: string) {
  return status === "rejected" || status === "dismissed" || status === "needs_follow_up";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SubmissionsInboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const statusFilter = parseStatusFilter(sp["status"]);
  const memberTypeFilter = sp["memberType"] ?? "";
  const docTypeFilter = sp["docType"] ?? "";

  // ── Count by status (unfiltered except for memberType/docType) ────────────
  const countConditions = [];
  if (memberTypeFilter) countConditions.push(eq(aderoPortalSubmissions.memberType, memberTypeFilter));
  if (docTypeFilter) countConditions.push(eq(aderoPortalSubmissions.documentType, docTypeFilter));

  const statusCounts = await db
    .select({ status: aderoPortalSubmissions.status, n: count() })
    .from(aderoPortalSubmissions)
    .where(countConditions.length > 0 ? and(...countConditions) : undefined)
    .groupBy(aderoPortalSubmissions.status);

  const countOf = (...statuses: string[]) =>
    statusCounts.reduce(
      (total, row) => total + (statuses.includes(row.status) ? Number(row.n) : 0),
      0,
    );
  const pendingCount = countOf("pending");
  const acceptedCount = countOf("accepted", "reviewed");
  const rejectedCount = countOf("rejected", "dismissed");
  const needsFollowUpCount = countOf("needs_follow_up");
  const totalCount = pendingCount + acceptedCount + rejectedCount + needsFollowUpCount;

  // ── Submissions with member names ─────────────────────────────────────────
  const listConditions = [];
  if (statusFilter !== "all") {
    listConditions.push(
      inArray(aderoPortalSubmissions.status, filterValuesForStatus(statusFilter)),
    );
  }
  if (memberTypeFilter) listConditions.push(eq(aderoPortalSubmissions.memberType, memberTypeFilter));
  if (docTypeFilter) listConditions.push(eq(aderoPortalSubmissions.documentType, docTypeFilter));

  const rows = await db
    .select({
      submission: aderoPortalSubmissions,
      companyName: aderoCompanyProfiles.companyName,
      operatorName: aderoOperatorProfiles.fullName,
      supersedingSubmissionId: supersedingSubmissions.id,
      supersedingSubmissionStatus: supersedingSubmissions.status,
      supersedingSubmissionCreatedAt: supersedingSubmissions.createdAt,
    })
    .from(aderoPortalSubmissions)
    .leftJoin(
      aderoCompanyProfiles,
      eq(aderoPortalSubmissions.companyProfileId, aderoCompanyProfiles.id),
    )
    .leftJoin(
      aderoOperatorProfiles,
      eq(aderoPortalSubmissions.operatorProfileId, aderoOperatorProfiles.id),
    )
    .leftJoin(
      supersedingSubmissions,
      eq(supersedingSubmissions.supersedesSubmissionId, aderoPortalSubmissions.id),
    )
    .where(listConditions.length > 0 ? and(...listConditions) : undefined)
    .orderBy(desc(aderoPortalSubmissions.createdAt))
    .limit(200);

  // ── Generate presigned download URLs ──────────────────────────────────────
  const downloadUrls = new Map<string, string>();
  await Promise.all(
    rows
      .filter((r) => r.submission.fileKey)
      .map(async (r) => {
        try {
          const url = await createPresignedGet(r.submission.fileKey!);
          downloadUrls.set(r.submission.id, url);
        } catch {
          // best-effort
        }
      }),
  );

  // ── Filter URL helpers ────────────────────────────────────────────────────
  function filterUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const merged = { status: statusFilter, memberType: memberTypeFilter, docType: docTypeFilter, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/admin/submissions?${params.toString()}`;
  }

  const STATUS_TABS = [
    { value: "pending", label: "Pending", count: pendingCount },
    { value: "accepted", label: "Accepted", count: acceptedCount },
    { value: "rejected", label: "Rejected", count: rejectedCount },
    { value: "needs_follow_up", label: "Needs Follow-Up", count: needsFollowUpCount },
    { value: "all", label: "All", count: totalCount },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Submission Inbox
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#475569" }}>
          Portal document submissions from all Adero members.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-5">
        {[
          { label: "Pending", value: pendingCount, color: pendingCount > 0 ? "#facc15" : "#334155" },
          { label: "Accepted", value: acceptedCount, color: acceptedCount > 0 ? "#4ade80" : "#334155" },
          { label: "Rejected", value: rejectedCount, color: rejectedCount > 0 ? "#f87171" : "#334155" },
          { label: "Needs Follow-Up", value: needsFollowUpCount, color: needsFollowUpCount > 0 ? "#fb923c" : "#334155" },
          { label: "Total", value: totalCount, color: "#64748b" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border p-4"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-2xl font-light tabular-nums" style={{ color }}>
              {value}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "#475569" }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <Link
                key={tab.value}
                href={filterUrl({ status: tab.value })}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={
                  active
                    ? { background: "rgba(99,102,241,0.2)", color: "#818cf8" }
                    : { background: "rgba(255,255,255,0.04)", color: "#475569" }
                }
              >
                {tab.label}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] tabular-nums"
                  style={
                    active
                      ? { background: "rgba(99,102,241,0.3)", color: "#c7d2fe" }
                      : { background: "rgba(255,255,255,0.06)", color: "#334155" }
                  }
                >
                  {tab.count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Member type + document type filters */}
        <div className="flex flex-wrap gap-2">
          {/* Member type */}
          <div className="flex items-center gap-1">
            {["", "company", "operator"].map((v) => {
              const label = v === "" ? "All members" : v === "company" ? "Companies" : "Operators";
              const active = memberTypeFilter === v;
              return (
                <Link
                  key={v}
                  href={filterUrl({ memberType: v })}
                  className="rounded-md px-2.5 py-1 text-xs transition-colors"
                  style={
                    active
                      ? { background: "rgba(255,255,255,0.1)", color: "#e2e8f0" }
                      : { color: "#475569" }
                  }
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <span style={{ color: "rgba(255,255,255,0.08)" }}>|</span>

          {/* Document type */}
          <div className="flex flex-wrap items-center gap-1">
            <Link
              href={filterUrl({ docType: "" })}
              className="rounded-md px-2.5 py-1 text-xs transition-colors"
              style={
                !docTypeFilter
                  ? { background: "rgba(255,255,255,0.1)", color: "#e2e8f0" }
                  : { color: "#475569" }
              }
            >
              All docs
            </Link>
            {MEMBER_DOCUMENT_TYPES.map((dt) => {
              const active = docTypeFilter === dt;
              return (
                <Link
                  key={dt}
                  href={filterUrl({ docType: dt })}
                  className="rounded-md px-2.5 py-1 text-xs transition-colors"
                  style={
                    active
                      ? { background: "rgba(255,255,255,0.1)", color: "#e2e8f0" }
                      : { color: "#475569" }
                  }
                >
                  {MEMBER_DOCUMENT_TYPE_LABELS[dt]}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Submission list */}
      {rows.length === 0 ? (
        <div
          className="rounded-xl border px-5 py-10 text-center"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.01)" }}
        >
          <p className="text-sm" style={{ color: "#334155" }}>
            No submissions match the current filters.
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          {rows.map(
            ({
              submission: sub,
              companyName,
              operatorName,
              supersedingSubmissionId,
              supersedingSubmissionStatus,
              supersedingSubmissionCreatedAt,
            }) => {
            const memberType = sub.memberType as "company" | "operator";
            const memberName = memberType === "company" ? (companyName ?? "Unknown company") : (operatorName ?? "Unknown operator");
            const profileId = memberType === "company" ? sub.companyProfileId : sub.operatorProfileId;
            const profileHref = profileId
              ? memberType === "company"
                ? `/admin/profiles/companies/${profileId}`
                : `/admin/profiles/operators/${profileId}`
              : null;
            const docLabel =
              MEMBER_DOCUMENT_TYPE_LABELS[sub.documentType as MemberDocumentType] ??
              sub.documentType;
            const ss = statusStyle(sub.status);
            const downloadUrl = downloadUrls.get(sub.id);
            const newerSubmission =
              supersedingSubmissionId && supersedingSubmissionStatus && supersedingSubmissionCreatedAt
                ? {
                    id: supersedingSubmissionId,
                    status: supersedingSubmissionStatus,
                    createdAt: supersedingSubmissionCreatedAt,
                  }
                : null;

            return (
              <div
                key={sub.id}
                className="border-b px-5 py-4 last:border-b-0"
                style={{
                  borderColor: "rgba(255,255,255,0.05)",
                  background: sub.status === "pending"
                    ? "rgba(234,179,8,0.02)"
                    : "rgba(255,255,255,0.01)",
                }}
              >
                {/* Top row: member + doc type + status + date */}
                <div className="flex flex-wrap items-start gap-2">
                  {/* Member type pill */}
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={
                      memberType === "company"
                        ? { background: "rgba(99,102,241,0.1)", color: "#818cf8" }
                        : { background: "rgba(20,184,166,0.1)", color: "#2dd4bf" }
                    }
                  >
                    {memberType === "company" ? "Company" : "Operator"}
                  </span>

                  {/* Member name */}
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      className="text-sm font-medium transition-opacity hover:opacity-70"
                      style={{ color: "#e2e8f0" }}
                    >
                      {memberName}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
                      {memberName}
                    </span>
                  )}

                  {/* Doc type */}
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                  >
                    {docLabel}
                  </span>

                  {/* Status */}
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: ss.bg, color: ss.color }}
                  >
                    {ss.label}
                  </span>

                  {/* Date */}
                  <span className="ml-auto shrink-0 text-[11px]" style={{ color: "#475569" }}>
                    {fmtTimestamp(sub.createdAt)}
                  </span>
                </div>

                {/* Member note */}
                <p
                  className="mt-2 text-xs leading-relaxed line-clamp-3"
                  style={{ color: "#94a3b8" }}
                >
                  {sub.memberNote}
                </p>

                {/* File attachment */}
                {sub.fileName && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: "#475569" }}>
                      📎 {sub.fileName}
                      {sub.fileSizeBytes ? ` · ${formatBytes(sub.fileSizeBytes)}` : ""}
                    </span>
                    {downloadUrl ? (
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium transition-opacity hover:opacity-80"
                        style={{ color: "#6366f1" }}
                      >
                        Download ↗
                      </a>
                    ) : (
                      <span className="text-[11px]" style={{ color: "#334155" }}>
                        (link unavailable)
                      </span>
                    )}
                  </div>
                )}

                {/* Review context (non-pending) */}
                {sub.status !== "pending" && sub.reviewedBy && (
                  <p className="mt-2 text-[11px]" style={{ color: "#334155" }}>
                    {reviewContextPrefix(sub.status)} by {sub.reviewedBy}
                    {sub.reviewNote ? ` — ${sub.reviewNote}` : ""}
                  </p>
                )}

                {sub.supersedesSubmissionId && (
                  <p className="mt-2 text-[11px] font-mono" style={{ color: "#64748b" }}>
                    Supersedes submission {sub.supersedesSubmissionId}.
                  </p>
                )}

                {newerSubmission && (
                  <p className="mt-2 text-[11px] font-mono" style={{ color: "#64748b" }}>
                    {isFollowUpOutcomeStatus(sub.status)
                      ? "Followed by newer member response"
                      : "Superseded by newer submission"}{" "}
                    {newerSubmission.id} on {fmtTimestamp(newerSubmission.createdAt)} (
                    {statusStyle(newerSubmission.status).label.toLowerCase()}).
                  </p>
                )}

                {/* Actions row */}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {/* Profile link */}
                  {profileHref && (
                    <Link
                      href={profileHref}
                      className="text-[11px] transition-opacity hover:opacity-70"
                      style={{ color: "#475569" }}
                    >
                      View profile →
                    </Link>
                  )}

                  {/* Review outcomes — pending only */}
                  {sub.status === "pending" && profileId && !newerSubmission && (
                    <form action={reviewPortalSubmission} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="submissionId" value={sub.id} />
                      <input type="hidden" name="memberType" value={memberType} />
                      <input type="hidden" name="profileId" value={profileId} />
                      <input
                        type="text"
                        name="reviewNote"
                        maxLength={300}
                        placeholder="Optional review note"
                        className="w-full rounded-md border bg-transparent px-2.5 py-1 text-xs outline-none sm:w-64"
                        style={{ borderColor: "rgba(255,255,255,0.1)", color: "#cbd5e1" }}
                      />
                      <button
                        type="submit"
                        name="newStatus"
                        value="accepted"
                        className="rounded-md px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}
                      >
                        Accept
                      </button>
                      <button
                        type="submit"
                        name="newStatus"
                        value="needs_follow_up"
                        className="rounded-md px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ background: "rgba(249,115,22,0.14)", color: "#fb923c" }}
                      >
                        Needs follow-up
                      </button>
                      <button
                        type="submit"
                        name="newStatus"
                        value="rejected"
                        className="rounded-md px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ background: "rgba(239,68,68,0.14)", color: "#f87171" }}
                      >
                        Reject
                      </button>
                    </form>
                  )}

                  {sub.status === "pending" && newerSubmission && (
                    <p className="text-[11px]" style={{ color: "#64748b" }}>
                      This pending item is superseded by submission {newerSubmission.id}.
                    </p>
                  )}
                </div>
              </div>
            );
            },
          )}
        </div>
      )}

      {rows.length === 200 && (
        <p className="text-xs" style={{ color: "#334155" }}>
          Showing the 200 most recent matching submissions.
        </p>
      )}
    </div>
  );
}
