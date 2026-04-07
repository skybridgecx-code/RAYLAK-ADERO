"use client";

import { useActionState } from "react";
import {
  COMPLIANCE_ESCALATION_STATUSES,
  COMPLIANCE_ESCALATION_STATUS_LABELS,
  type ComplianceEscalationStatus,
  type MemberDocumentType,
} from "~/lib/validators";
import type { AderoMemberType } from "~/lib/document-monitoring";
import { updateComplianceEscalation, type EscalationActionState } from "./actions";

const initialState: EscalationActionState = {
  error: null,
  fieldErrors: {},
  saved: false,
};

export function EscalationForm({
  memberType,
  profileId,
  documentType,
  currentStatus,
}: {
  memberType: AderoMemberType;
  profileId: string;
  documentType: MemberDocumentType;
  currentStatus: ComplianceEscalationStatus;
}) {
  const [state, formAction, isPending] = useActionState(updateComplianceEscalation, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="memberType" value={memberType} />
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="documentType" value={documentType} />

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium" style={{ color: "#64748b" }}>
            Escalation
          </label>
          <select
            name="escalationStatus"
            defaultValue={currentStatus}
            className="rounded-md border px-2.5 py-1.5 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          >
            {COMPLIANCE_ESCALATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {COMPLIANCE_ESCALATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-28">
          <label className="mb-1 block text-[11px] font-medium" style={{ color: "#64748b" }}>
            Reason
          </label>
          <input
            name="escalationNote"
            placeholder="Optional context"
            className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium" style={{ color: "#64748b" }}>
            Your name
          </label>
          <input
            name="actorName"
            placeholder="Optional"
            className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
          style={{
            background: "#1e293b",
            color: "#94a3b8",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {isPending ? "Saving…" : "Update"}
        </button>
      </div>

      {state.error && (
        <p className="text-xs" style={{ color: "#f87171" }}>
          {state.error}
        </p>
      )}

      {state.saved && (
        <p className="text-xs" style={{ color: "#4ade80" }}>
          Escalation updated.
        </p>
      )}
    </form>
  );
}
