import type { Metadata } from "next";
import Link from "next/link";
import {
  aderoCompanyProfiles,
  aderoOperatorProfiles,
  aderoPortalSubmissions,
  db,
} from "@raylak/db";
import { and, count, desc, eq } from "drizzle-orm";
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
  reviewed: { label: "Reviewed", bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  dismissed: { label: "Dismissed", bg: "rgba(148,163,184,0.1)", color: "#64748b" },
} as const;

type KnownStatus = keyof typeof STATUS_STYLES;

function statusStyle(status: string) {
  return status in STATUS_STYLES
    ? STATUS_STYLES[status as KnownStatus]
    : STATUS_STYLES.pending;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SubmissionsInboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const statusFilter = sp["status"] ?? "pending";
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

  const countOf = (s: string) => statusCounts.find((r) => r.status === s)?.n ?? 0;
  const pendingCount = countOf("pending");
  const reviewedCount = countOf("reviewed");
  const dismissedCount = countOf("dismissed");
  const totalCount = pendingCount + reviewedCount + dismissedCount;

  // ── Submissions with member names ─────────────────────────────────────────
  const listConditions = [];
  if (statusFilter !== "all") listConditions.push(eq(aderoPortalSubmissions.status, statusFilter));
  if (memberTypeFilter) listConditions.push(eq(aderoPortalSubmissions.memberType, memberTypeFilter));
  if (docTypeFilter) listConditions.push(eq(aderoPortalSubmissions.documentType, docTypeFilter));

  const rows = await db
    .select({
      submission: aderoPortalSubmissions,
      companyName: aderoCompanyProfiles.companyName,
      operatorName: aderoOperatorProfiles.fullName,
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
    { value: "reviewed", label: "Reviewed", count: reviewedCount },
    { value: "dismissed", label: "Dismissed", count: dismissedCount },
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
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Pending", value: pendingCount, color: pendingCount > 0 ? "#facc15" : "#334155" },
          { label: "Reviewed", value: reviewedCount, color: reviewedCount > 0 ? "#4ade80" : "#334155" },
          { label: "Dismissed", value: dismissedCount, color: "#475569" },
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
          {rows.map(({ submission: sub, companyName, operatorName }) => {
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
                    {sub.status === "reviewed" ? "Reviewed" : "Dismissed"} by {sub.reviewedBy}
                    {sub.reviewNote ? ` — ${sub.reviewNote}` : ""}
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

                  {/* Review/dismiss — pending only */}
                  {sub.status === "pending" && profileId && (
                    <>
                      <form action={reviewPortalSubmission}>
                        <input type="hidden" name="submissionId" value={sub.id} />
                        <input type="hidden" name="newStatus" value="reviewed" />
                        <input type="hidden" name="memberType" value={memberType} />
                        <input type="hidden" name="profileId" value={profileId} />
                        <button
                          type="submit"
                          className="rounded-md px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                          style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}
                        >
                          Mark reviewed
                        </button>
                      </form>

                      <form action={reviewPortalSubmission}>
                        <input type="hidden" name="submissionId" value={sub.id} />
                        <input type="hidden" name="newStatus" value="dismissed" />
                        <input type="hidden" name="memberType" value={memberType} />
                        <input type="hidden" name="profileId" value={profileId} />
                        <button
                          type="submit"
                          className="rounded-md px-3 py-1 text-xs transition-opacity hover:opacity-60"
                          style={{ color: "#475569" }}
                        >
                          Dismiss
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            );
          })}
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
