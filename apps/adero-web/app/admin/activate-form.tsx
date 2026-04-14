"use client";

import { useActionState } from "react";
import { updateApplicationStatus } from "./actions";

export function ActivateForm({
  type,
  id,
}: {
  type: "company" | "operator";
  id: string;
}) {
  const [state, formAction, isPending] = useActionState(updateApplicationStatus, { error: null });

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{
        borderColor: "rgba(34,197,94,0.3)",
        background: "rgba(34,197,94,0.04)",
      }}
    >
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-[3px] mb-1"
          style={{ color: "#22c55e" }}
        >
          Ready to Activate
        </p>
        <p className="text-xs" style={{ color: "#475569" }}>
          Activating marks this applicant as live on the Adero network.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value="activated" />

        <div>
          <label
            htmlFor="activate-reviewer"
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "#64748b" }}
          >
            Your name
          </label>
          <input
            id="activate-reviewer"
            name="reviewerName"
            type="text"
            placeholder="Required for activation record"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(34,197,94,0.25)",
              background: "rgba(34,197,94,0.06)",
              color: "#f1f5f9",
            }}
          />
        </div>

        {state.error && (
          <p className="text-xs" style={{ color: "#f87171" }}>
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ background: "#22c55e", color: "#052e16" }}
        >
          {isPending ? "Activating…" : "Activate Applicant"}
        </button>
      </form>
    </div>
  );
}
