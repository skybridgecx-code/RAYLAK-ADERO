"use client";

import { useActionState } from "react";
import { ADERO_DISPUTE_CATEGORIES, ADERO_DISPUTE_CATEGORY_LABELS } from "@raylak/shared";
import { fileDispute, type DisputeActionState } from "@/app/app/disputes/actions";

const initialState: DisputeActionState = {
  error: null,
  success: null,
};

type DisputeFormProps = {
  tripId: string;
  filedAgainstUserId?: string;
};

export function DisputeForm({ tripId, filedAgainstUserId }: DisputeFormProps) {
  const [state, action, isPending] = useActionState(fileDispute, initialState);

  if (state.success) {
    return (
      <div
        className="rounded-xl border p-5"
        style={{
          borderColor: "rgba(74,222,128,0.2)",
          background: "rgba(74,222,128,0.05)",
        }}
      >
        <p className="text-sm" style={{ color: "#4ade80" }}>
          {state.success}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
        File Dispute
      </p>

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="filedAgainstUserId" value={filedAgainstUserId ?? ""} />

        <div>
          <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
            Category
          </label>
          <select
            name="category"
            required
            className="mt-1 w-full rounded-md border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Select a category
            </option>
            {ADERO_DISPUTE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {ADERO_DISPUTE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
            Subject
          </label>
          <input
            name="subject"
            required
            maxLength={255}
            className="mt-1 w-full rounded-md border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
            placeholder="Brief summary of the issue"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
            Description
          </label>
          <textarea
            name="description"
            required
            rows={4}
            maxLength={5000}
            className="mt-1 w-full resize-none rounded-md border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
            placeholder="Describe what happened in detail"
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
          className="rounded-md px-4 py-2 text-xs font-medium transition-opacity disabled:opacity-50"
          style={{
            background: "rgba(99,102,241,0.16)",
            color: "#a5b4fc",
          }}
        >
          {isPending ? "Submitting..." : "Submit Dispute"}
        </button>
      </form>
    </div>
  );
}
