"use client";

import { useActionState } from "react";
import type { MemberDocumentType } from "~/lib/validators";
import { MEMBER_DOCUMENT_TYPE_LABELS } from "~/lib/validators";
import { submitPortalDocument, type PortalSubmitState } from "./submit-actions";

const initial: PortalSubmitState = { error: null, submitted: false };

export function PortalSubmitForm({
  token,
  memberType,
  profileId,
  attentionTypes,
}: {
  token: string;
  memberType: "company" | "operator";
  profileId: string;
  attentionTypes: MemberDocumentType[];
}) {
  const [state, action, isPending] = useActionState(submitPortalDocument, initial);

  if (state.submitted) {
    return (
      <div
        className="rounded-xl border px-5 py-4 space-y-1"
        style={{ borderColor: "rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.04)" }}
      >
        <p className="text-sm font-medium" style={{ color: "#4ade80" }}>
          Submission received.
        </p>
        <p className="text-xs" style={{ color: "#64748b" }}>
          Your update has been sent to your Adero representative for review.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="memberType" value={memberType} />
      <input type="hidden" name="profileId" value={profileId} />

      {/* Document type */}
      <div className="space-y-1.5">
        <label
          htmlFor="ps-documentType"
          className="block text-xs font-medium"
          style={{ color: "#94a3b8" }}
        >
          Document type
        </label>
        <select
          id="ps-documentType"
          name="documentType"
          required
          disabled={isPending}
          defaultValue=""
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none disabled:opacity-60"
          style={{
            borderColor: "rgba(255,255,255,0.1)",
            color: "#e2e8f0",
            background: "#0f172a",
          }}
        >
          <option value="" disabled style={{ background: "#0f172a" }}>
            Select a document type…
          </option>
          {attentionTypes.map((t) => (
            <option key={t} value={t} style={{ background: "#0f172a" }}>
              {MEMBER_DOCUMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Note */}
      <div className="space-y-1.5">
        <label
          htmlFor="ps-memberNote"
          className="block text-xs font-medium"
          style={{ color: "#94a3b8" }}
        >
          Describe your submission
        </label>
        <textarea
          id="ps-memberNote"
          name="memberNote"
          rows={4}
          required
          disabled={isPending}
          placeholder="e.g. I emailed my updated insurance certificate to the contact on file. Policy #12345, expires Jan 2027."
          className="w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm outline-none resize-none disabled:opacity-60 placeholder:text-slate-700"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
        />
        <p className="text-[11px]" style={{ color: "#334155" }}>
          Do not include sensitive personal or payment information.
        </p>
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
        style={{ background: "#6366f1", color: "#fff" }}
      >
        {isPending ? "Submitting…" : "Submit update"}
      </button>
    </form>
  );
}
