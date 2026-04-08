"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ADERO_OPERATOR_AVAILABILITY_STATUSES,
  ADERO_OPERATOR_AVAILABILITY_STATUS_LABELS,
  type AderoOperatorAvailabilityStatus,
} from "@raylak/db/schema";
import {
  setAvailability,
  type OperatorWorkflowActionState,
} from "./actions";

const initialState: OperatorWorkflowActionState = {
  error: null,
  success: null,
  tripId: null,
};

export function AvailabilityToggle({
  currentStatus,
  currentServiceArea,
}: {
  currentStatus: AderoOperatorAvailabilityStatus;
  currentServiceArea: string;
}) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(setAvailability, initialState);
  const [selected, setSelected] = useState<AderoOperatorAvailabilityStatus>(currentStatus);
  const [serviceArea, setServiceArea] = useState(currentServiceArea);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
        Availability
      </p>
      <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
        Set your dispatch availability status.
      </p>

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="availabilityStatus" value={selected} />

        <div className="flex flex-wrap gap-2">
          {ADERO_OPERATOR_AVAILABILITY_STATUSES.map((status) => {
            const active = selected === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setSelected(status)}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity"
                style={
                  active
                    ? { background: "rgba(99,102,241,0.22)", color: "#c7d2fe" }
                    : { background: "rgba(255,255,255,0.05)", color: "#94a3b8" }
                }
              >
                {ADERO_OPERATOR_AVAILABILITY_STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>

        <div className="space-y-1">
          <label className="block text-[11px]" style={{ color: "#64748b" }}>
            Service area (optional)
          </label>
          <input
            name="serviceArea"
            type="text"
            maxLength={255}
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
            placeholder="e.g. Manhattan, JFK/LGA corridor"
            className="w-full rounded-md border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
          style={{ background: "rgba(99,102,241,0.2)", color: "#c7d2fe" }}
        >
          {isPending ? "Saving..." : "Save Availability"}
        </button>

        {state.error && (
          <p className="text-xs" style={{ color: "#f87171" }}>
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-xs" style={{ color: "#4ade80" }}>
            {state.success}
          </p>
        )}
      </form>
    </div>
  );
}
