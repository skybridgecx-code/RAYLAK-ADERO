import type { AderoPortalSubmission } from "@raylak/db";
import type { AderoMemberType } from "~/lib/document-monitoring";
import { createPresignedGet } from "~/lib/s3";
import { MEMBER_DOCUMENT_TYPE_LABELS, type MemberDocumentType } from "~/lib/validators";
import { reviewPortalSubmission } from "./portal-submission-actions";

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

type StatusStyle = { label: string; bg: string; color: string };

const STATUS_STYLES: Record<
  "pending" | "accepted" | "rejected" | "needs_follow_up" | "reviewed" | "dismissed",
  StatusStyle
> = {
  pending: { label: "Pending Review", bg: "rgba(234,179,8,0.12)", color: "#facc15" },
  accepted: { label: "Accepted", bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  rejected: { label: "Rejected", bg: "rgba(239,68,68,0.12)", color: "#f87171" },
  needs_follow_up: { label: "Needs Follow-Up", bg: "rgba(249,115,22,0.12)", color: "#fb923c" },
  // Legacy statuses kept for backward-compatible rendering before migration runs.
  reviewed: { label: "Accepted", bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  dismissed: { label: "Rejected", bg: "rgba(239,68,68,0.12)", color: "#f87171" },
};

const FALLBACK_STATUS: StatusStyle = STATUS_STYLES.pending;

function reviewContextPrefix(status: string) {
  if (status === "accepted" || status === "reviewed") return "Accepted";
  if (status === "rejected" || status === "dismissed") return "Rejected";
  if (status === "needs_follow_up") return "Needs follow-up";
  return "Reviewed";
}

function isFollowUpOutcomeStatus(status: string) {
  return status === "rejected" || status === "dismissed" || status === "needs_follow_up";
}

export async function PortalSubmissionsPanel({
  submissions,
  memberType,
  profileId,
}: {
  submissions: AderoPortalSubmission[];
  memberType: AderoMemberType;
  profileId: string;
}) {
  if (submissions.length === 0) return null;

  // Generate presigned GET URLs for any submissions that have a file attachment
  const downloadUrls = new Map<string, string>();
  await Promise.all(
    submissions
      .filter((s) => s.fileKey)
      .map(async (s) => {
        try {
          const url = await createPresignedGet(s.fileKey!);
          downloadUrls.set(s.id, url);
        } catch {
          // Best-effort — don't fail the page if presign fails
        }
      }),
  );

  type NewerSubmissionContext = { status: string; createdAt: Date };
  const newerSubmissionById = new Map<string, NewerSubmissionContext>();
  const latestSubmissionByDocument = new Map<string, NewerSubmissionContext>();

  for (const submission of submissions) {
    const latestForDocument = latestSubmissionByDocument.get(submission.documentType);
    if (latestForDocument) {
      newerSubmissionById.set(submission.id, latestForDocument);
    }
    latestSubmissionByDocument.set(submission.documentType, {
      status: submission.status,
      createdAt: submission.createdAt,
    });
  }

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-[3px]" style={{ color: "#475569" }}>
        Portal Submissions
      </p>

      <div className="space-y-4">
        {submissions.map((sub) => {
          const statusStyle =
            (sub.status in STATUS_STYLES
              ? STATUS_STYLES[sub.status as keyof typeof STATUS_STYLES]
              : null) ?? FALLBACK_STATUS;
          const docLabel =
            MEMBER_DOCUMENT_TYPE_LABELS[sub.documentType as MemberDocumentType] ??
            sub.documentType;
          const downloadUrl = downloadUrls.get(sub.id);
          const newerSubmission = newerSubmissionById.get(sub.id);

          return (
            <div
              key={sub.id}
              className="space-y-3 rounded-lg border p-4"
              style={{
                borderColor: "rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.01)",
              }}
            >
              {/* Header row */}
              <div className="flex flex-wrap items-start gap-2">
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}
                >
                  {docLabel}
                </span>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: statusStyle.bg, color: statusStyle.color }}
                >
                  {statusStyle.label}
                </span>
                <span className="ml-auto text-[11px]" style={{ color: "#475569" }}>
                  {fmtTimestamp(sub.createdAt)}
                </span>
              </div>

              {/* Member note */}
              <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
                {sub.memberNote}
              </p>

              {/* File attachment */}
              {sub.fileName && (
                <div className="flex items-center gap-2">
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

              {/* Reviewed-by context */}
              {sub.status !== "pending" && sub.reviewedBy && (
                <p className="text-[11px]" style={{ color: "#334155" }}>
                  {reviewContextPrefix(sub.status)} by {sub.reviewedBy}
                  {sub.reviewNote ? ` — ${sub.reviewNote}` : ""}
                </p>
              )}

              {newerSubmission && (
                <p className="text-[11px]" style={{ color: "#64748b" }}>
                  {isFollowUpOutcomeStatus(sub.status)
                    ? "Followed by newer member response"
                    : "Superseded by newer submission"}{" "}
                  on {fmtTimestamp(newerSubmission.createdAt)} (
                  {((newerSubmission.status in STATUS_STYLES
                    ? STATUS_STYLES[newerSubmission.status as keyof typeof STATUS_STYLES]
                    : FALLBACK_STATUS
                  ).label).toLowerCase()}
                  ).
                </p>
              )}

              {/* Review actions — only for pending */}
              {sub.status === "pending" && !newerSubmission && (
                <form action={reviewPortalSubmission} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="submissionId" value={sub.id} />
                  <input type="hidden" name="memberType" value={memberType} />
                  <input type="hidden" name="profileId" value={profileId} />
                  <input
                    type="text"
                    name="reviewNote"
                    maxLength={300}
                    placeholder="Optional review note"
                    className="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-xs outline-none sm:w-64"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: "#cbd5e1" }}
                  />
                  <button
                    type="submit"
                    name="newStatus"
                    value="accepted"
                    className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}
                  >
                    Accept
                  </button>
                  <button
                    type="submit"
                    name="newStatus"
                    value="needs_follow_up"
                    className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: "rgba(249,115,22,0.14)", color: "#fb923c" }}
                  >
                    Needs follow-up
                  </button>
                  <button
                    type="submit"
                    name="newStatus"
                    value="rejected"
                    className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: "rgba(239,68,68,0.14)", color: "#f87171" }}
                  >
                    Reject
                  </button>
                </form>
              )}

              {sub.status === "pending" && newerSubmission && (
                <p className="text-[11px]" style={{ color: "#64748b" }}>
                  This pending item is superseded by a newer member response.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
