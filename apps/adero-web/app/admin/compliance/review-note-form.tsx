"use client";

import { useActionState } from "react";
import type { AderoMemberType } from "~/lib/document-monitoring";
import type { MemberDocumentType } from "~/lib/validators";
import { addComplianceReviewNote, type ReviewNoteActionState } from "./actions";

const initialState: ReviewNoteActionState = {
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

export function ReviewNoteForm({
  memberType,
  profileId,
  documentType,
}: {
  memberType: AderoMemberType;
  profileId: string;
  documentType: MemberDocumentType;
}) {
  const [state, formAction, isPending] = useActionState(addComplianceReviewNote, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="memberType" value={memberType} />
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="documentType" value={documentType} />

      <div>
        <label className="mb-1 block text-[11px] font-medium" style={{ color: "#64748b" }}>
          Review note
        </label>
        <textarea
          name="note"
          rows={2}
          placeholder="Investigation context, findings, next steps..."
          className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none resize-none"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            background: "#1e293b",
            color: "#f1f5f9",
          }}
        />
        <FieldError messages={state.fieldErrors["note"]} />
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-28">
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
          {isPending ? "Saving…" : "Add note"}
        </button>
      </div>

      {state.error && (
        <p className="text-xs" style={{ color: "#f87171" }}>
          {state.error}
        </p>
      )}

      {state.saved && (
        <p className="text-xs" style={{ color: "#4ade80" }}>
          Note saved.
        </p>
      )}
    </form>
  );
}
