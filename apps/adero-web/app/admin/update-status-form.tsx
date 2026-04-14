"use client";

import { useActionState } from "react";
import { updateApplicationStatus } from "./actions";
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from "~/lib/validators";

export function UpdateStatusForm({
  type,
  id,
  currentStatus,
}: {
  type: "company" | "operator";
  id: string;
  currentStatus: string;
}) {
  const [state, formAction, isPending] = useActionState(updateApplicationStatus, { error: null });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />

      <div>
        <label
          htmlFor="status-select"
          className="block text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: "#64748b" }}
        >
          Status
        </label>
        <select
          id="status-select"
          name="status"
          defaultValue={currentStatus}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            background: "#1e293b",
            color: "#f1f5f9",
          }}
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s} style={{ background: "#1e293b" }}>
              {APPLICATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="reviewer-name"
          className="block text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: "#64748b" }}
        >
          Your name
        </label>
        <input
          id="reviewer-name"
          name="reviewerName"
          type="text"
          placeholder="Optional — for attribution"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            background: "#1e293b",
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
        className="w-full rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
        style={{ background: "#6366f1", color: "#fff" }}
      >
        {isPending ? "Saving…" : "Update Status"}
      </button>
    </form>
  );
}
