import type { AderoPortalSubmission } from "@raylak/db";
import type { AderoMemberType } from "~/lib/document-monitoring";
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

type StatusStyle = { label: string; bg: string; color: string };

const STATUS_STYLES: Record<"pending" | "reviewed" | "dismissed", StatusStyle> = {
  pending: { label: "Pending Review", bg: "rgba(234,179,8,0.12)", color: "#facc15" },
  reviewed: { label: "Reviewed", bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  dismissed: { label: "Dismissed", bg: "rgba(148,163,184,0.1)", color: "#64748b" },
};

const FALLBACK_STATUS: StatusStyle = STATUS_STYLES.pending;

export function PortalSubmissionsPanel({
  submissions,
  memberType,
  profileId,
}: {
  submissions: AderoPortalSubmission[];
  memberType: AderoMemberType;
  profileId: string;
}) {
  if (submissions.length === 0) return null;

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
            MEMBER_DOCUMENT_TYPE_LABELS[sub.documentType as MemberDocumentType] ?? sub.documentType;

          return (
            <div
              key={sub.id}
              className="space-y-3 rounded-lg border p-4"
              style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}
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

              {/* Reviewed-by context */}
              {sub.status !== "pending" && sub.reviewedBy && (
                <p className="text-[11px]" style={{ color: "#334155" }}>
                  {sub.status === "reviewed" ? "Reviewed" : "Dismissed"} by {sub.reviewedBy}
                  {sub.reviewNote ? ` — ${sub.reviewNote}` : ""}
                </p>
              )}

              {/* Review actions — only for pending */}
              {sub.status === "pending" && (
                <div className="flex flex-wrap gap-2">
                  <form action={reviewPortalSubmission}>
                    <input type="hidden" name="submissionId" value={sub.id} />
                    <input type="hidden" name="newStatus" value="reviewed" />
                    <input type="hidden" name="memberType" value={memberType} />
                    <input type="hidden" name="profileId" value={profileId} />
                    <button
                      type="submit"
                      className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
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
                      className="rounded-md px-3 py-1.5 text-xs transition-opacity hover:opacity-60"
                      style={{ color: "#475569" }}
                    >
                      Dismiss
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
