import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  aderoCompanyProfiles,
  aderoOperatorProfiles,
  aderoPortalSubmissions,
  db,
} from "@raylak/db";
import { and, asc, eq } from "drizzle-orm";
import {
  getChainTimelineForSubmission,
  getCurrentSubmissionByDocumentType,
  getSupersededByMap,
} from "~/lib/portal-submission-threading";
import { createPresignedGet } from "~/lib/s3";
import {
  MEMBER_DOCUMENT_TYPE_LABELS,
  type MemberDocumentType,
} from "~/lib/validators";
import { reviewPortalSubmission } from "../../profiles/portal-submission-actions";

export const metadata: Metadata = {
  title: "Submission Chain Timeline - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

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
  reviewed: { label: "Accepted", bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  dismissed: { label: "Rejected", bg: "rgba(239,68,68,0.12)", color: "#f87171" },
} as const;

type KnownStatus = keyof typeof STATUS_STYLES;

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

export default async function SubmissionChainTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(id)) notFound();

  const [row] = await db
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
    .where(eq(aderoPortalSubmissions.id, id))
    .limit(1);

  if (!row) notFound();

  const memberType = row.submission.memberType as "company" | "operator";
  const profileId =
    memberType === "company"
      ? row.submission.companyProfileId
      : row.submission.operatorProfileId;

  if (!profileId) notFound();

  const laneFilter = and(
    eq(aderoPortalSubmissions.memberType, memberType),
    eq(aderoPortalSubmissions.documentType, row.submission.documentType),
    memberType === "company"
      ? eq(aderoPortalSubmissions.companyProfileId, profileId)
      : eq(aderoPortalSubmissions.operatorProfileId, profileId),
  );

  const laneSubmissions = await db
    .select()
    .from(aderoPortalSubmissions)
    .where(laneFilter)
    .orderBy(asc(aderoPortalSubmissions.createdAt));

  const { timeline, warnings } = getChainTimelineForSubmission({
    submissions: laneSubmissions,
    submissionId: id,
  });

  const supersededBy = getSupersededByMap(laneSubmissions);
  const currentHead = getCurrentSubmissionByDocumentType(laneSubmissions).get(
    row.submission.documentType,
  );

  const profileHref =
    memberType === "company"
      ? `/admin/profiles/companies/${profileId}`
      : `/admin/profiles/operators/${profileId}`;
  const memberName =
    memberType === "company"
      ? (row.companyName ?? "Unknown company")
      : (row.operatorName ?? "Unknown operator");
  const docLabel =
    MEMBER_DOCUMENT_TYPE_LABELS[row.submission.documentType as MemberDocumentType] ??
    row.submission.documentType;

  const downloadUrls = new Map<string, string>();
  await Promise.all(
    timeline
      .filter((submission) => submission.fileKey)
      .map(async (submission) => {
        try {
          const url = await createPresignedGet(submission.fileKey!);
          downloadUrls.set(submission.id, url);
        } catch {
          // best-effort for timeline display
        }
      }),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "#64748b" }}>
          <Link href="/admin/submissions" className="transition-opacity hover:opacity-70">
            ← Submission inbox
          </Link>
          <span>•</span>
          <Link href={profileHref} className="transition-opacity hover:opacity-70">
            {memberName}
          </Link>
        </div>

        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Submission Chain Timeline
        </h1>

        <p className="text-sm" style={{ color: "#94a3b8" }}>
          {docLabel} · {memberType === "company" ? "Company" : "Operator"} · {timeline.length} item
          {timeline.length === 1 ? "" : "s"} in chain
        </p>

        {currentHead && (
          <p className="text-xs font-mono" style={{ color: "#64748b" }}>
            Current chain head: {currentHead.id} ({statusStyle(currentHead.status).label.toLowerCase()})
          </p>
        )}
      </div>

      {warnings.length > 0 && (
        <div
          className="rounded-xl border px-5 py-4 space-y-2"
          style={{ borderColor: "rgba(249,115,22,0.28)", background: "rgba(249,115,22,0.05)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#fb923c" }}>
            Chain integrity warnings
          </p>
          <div className="space-y-1">
            {warnings.map((warning) => (
              <p key={warning} className="text-xs" style={{ color: "#94a3b8" }}>
                {warning}
              </p>
            ))}
          </div>
        </div>
      )}

      {timeline.length === 0 ? (
        <div
          className="rounded-xl border px-5 py-10 text-center"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.01)" }}
        >
          <p className="text-sm" style={{ color: "#334155" }}>
            No timeline items found for this chain.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {timeline.map((submission, index) => {
            const ss = statusStyle(submission.status);
            const supersedingSubmission = supersededBy.get(submission.id) ?? null;
            const isSelected = submission.id === id;
            const isCurrentHead = currentHead?.id === submission.id;
            const canReview = submission.status === "pending" && isCurrentHead;
            const downloadUrl = downloadUrls.get(submission.id);

            return (
              <div
                key={submission.id}
                className="rounded-xl border p-5 space-y-3"
                style={{
                  borderColor: isSelected
                    ? "rgba(99,102,241,0.35)"
                    : "rgba(255,255,255,0.07)",
                  background: isSelected
                    ? "rgba(99,102,241,0.07)"
                    : "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                  >
                    Step {index + 1}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: ss.bg, color: ss.color }}
                  >
                    {ss.label}
                  </span>
                  {isSelected && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}
                    >
                      Selected
                    </span>
                  )}
                  {isCurrentHead && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}
                    >
                      Current Head
                    </span>
                  )}
                  <span className="ml-auto text-[11px]" style={{ color: "#64748b" }}>
                    {fmtTimestamp(submission.createdAt)}
                  </span>
                </div>

                <p className="text-xs font-mono break-all" style={{ color: "#64748b" }}>
                  Submission ID: {submission.id}
                </p>

                {submission.supersedesSubmissionId && (
                  <p className="text-xs font-mono" style={{ color: "#64748b" }}>
                    Supersedes: {submission.supersedesSubmissionId}
                  </p>
                )}

                {supersedingSubmission && (
                  <p className="text-xs font-mono" style={{ color: "#64748b" }}>
                    Superseded by: {supersedingSubmission.id}
                  </p>
                )}

                <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
                  {submission.memberNote}
                </p>

                {submission.fileName && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: "#475569" }}>
                      📎 {submission.fileName}
                      {submission.fileSizeBytes ? ` · ${formatBytes(submission.fileSizeBytes)}` : ""}
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

                {submission.status !== "pending" && submission.reviewedBy && (
                  <p className="text-[11px]" style={{ color: "#334155" }}>
                    {reviewContextPrefix(submission.status)} by {submission.reviewedBy}
                    {submission.reviewNote ? ` — ${submission.reviewNote}` : ""}
                  </p>
                )}

                {canReview && (
                  <form action={reviewPortalSubmission} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="submissionId" value={submission.id} />
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
