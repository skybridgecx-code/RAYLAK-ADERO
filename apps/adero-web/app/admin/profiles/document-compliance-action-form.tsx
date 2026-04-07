"use client";

import type { AderoDocumentComplianceNotification } from "@raylak/db";
import { useActionState } from "react";
import { StatusBadge } from "~/components/status-badge";
import { getComplianceIssueKey, getCurrentComplianceAction } from "~/lib/document-compliance";
import type { AderoMemberType } from "~/lib/document-monitoring";
import {
  MEMBER_DOCUMENT_COMPLIANCE_ACTIONS,
  MEMBER_DOCUMENT_COMPLIANCE_ACTION_LABELS,
  MEMBER_DOCUMENT_TYPE_LABELS,
  type MemberDocumentType,
} from "~/lib/validators";
import { createMemberDocumentComplianceAction, type ComplianceActionState } from "./actions";

const initialComplianceActionState: ComplianceActionState = {
  error: null,
  fieldErrors: {},
  saved: false,
};

function FieldError({ messages }: { messages: string[] | undefined }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1 text-xs" style={{ color: "#f87171" }}>
      {messages[0]}
    </p>
  );
}

function fmt(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DocumentComplianceActionForm({
  memberType,
  profileId,
  documentType,
  documentId,
  notifications,
  compact = false,
}: {
  memberType: AderoMemberType;
  profileId: string;
  documentType: MemberDocumentType;
  documentId?: string | null;
  notifications: AderoDocumentComplianceNotification[];
  compact?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    createMemberDocumentComplianceAction,
    initialComplianceActionState,
  );
  const issueKey = getComplianceIssueKey({ memberType, profileId, documentType });
  const issueNotifications = notifications.filter((notification) => {
    const notificationProfileId =
      notification.memberType === "company"
        ? notification.companyProfileId
        : notification.operatorProfileId;

    return (
      notification.memberType === memberType &&
      notificationProfileId === profileId &&
      notification.documentType === documentType
    );
  });
  const currentAction = getCurrentComplianceAction(
    notifications,
    memberType,
    profileId,
    documentType,
  );

  return (
    <div
      className={compact ? "space-y-3" : "space-y-4 rounded-lg border p-4"}
      style={
        compact
          ? undefined
          : {
              borderColor: "rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.015)",
            }
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[3px]"
            style={{ color: "#475569" }}
          >
            Compliance
          </p>
          <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
            {MEMBER_DOCUMENT_TYPE_LABELS[documentType]}
          </p>
        </div>
        {currentAction ? (
          <StatusBadge status={currentAction} />
        ) : (
          <span className="text-xs" style={{ color: "#475569" }}>
            No action yet
          </span>
        )}
      </div>

      {issueNotifications.length > 0 && (
        <div className="space-y-2">
          {issueNotifications.slice(0, compact ? 2 : 3).map((notification) => (
            <div
              key={`${issueKey}-${notification.id}`}
              className="rounded-md border px-3 py-2"
              style={{
                borderColor: "rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.01)",
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium" style={{ color: "#cbd5e1" }}>
                  {MEMBER_DOCUMENT_COMPLIANCE_ACTION_LABELS[
                    notification.actionType as keyof typeof MEMBER_DOCUMENT_COMPLIANCE_ACTION_LABELS
                  ] ?? notification.actionType}
                </span>
                <span className="text-[11px]" style={{ color: "#64748b" }}>
                  {fmt(notification.createdAt)}
                  {notification.actorName ? ` by ${notification.actorName}` : ""}
                </span>
              </div>
              {(notification.notes || notification.body) && (
                <p className="mt-1 text-[11px]" style={{ color: "#64748b" }}>
                  {notification.notes ?? notification.body}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="memberType" value={memberType} />
        <input type="hidden" name="profileId" value={profileId} />
        <input type="hidden" name="documentType" value={documentType} />
        {documentId ? <input type="hidden" name="documentId" value={documentId} /> : null}

        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#64748b" }}>
            Action
          </label>
          <select
            name="actionType"
            defaultValue="follow_up_needed"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          >
            {MEMBER_DOCUMENT_COMPLIANCE_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {MEMBER_DOCUMENT_COMPLIANCE_ACTION_LABELS[action]}
              </option>
            ))}
          </select>
          <FieldError messages={state.fieldErrors["actionType"]} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#64748b" }}>
            Your name
          </label>
          <input
            name="actorName"
            placeholder="Optional"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
          <FieldError messages={state.fieldErrors["actorName"]} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#64748b" }}>
            Notes
          </label>
          <textarea
            name="notes"
            rows={compact ? 2 : 3}
            placeholder="Internal follow-up context..."
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
          <FieldError messages={state.fieldErrors["notes"]} />
        </div>

        {state.error && (
          <p className="text-xs" style={{ color: "#f87171" }}>
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ background: "#0f172a", color: "#f8fafc" }}
        >
          {isPending ? "Saving..." : "Save compliance action"}
        </button>
      </form>
    </div>
  );
}
