"use client";

import { useActionState } from "react";
import {
  ADERO_TRIP_STATUS_LABELS,
  type AderoTripStatus,
} from "@raylak/db/schema";
import {
  advanceTripStatus,
  cancelTrip,
  type TripLifecycleActionState,
} from "../actions";

const initialState: TripLifecycleActionState = {
  error: null,
  success: null,
};

type TripStatusControlsProps = {
  tripId: string;
  nextStatuses: AderoTripStatus[];
};

export function TripStatusControls({
  tripId,
  nextStatuses,
}: TripStatusControlsProps) {
  const [advanceState, advanceAction, isAdvancing] = useActionState(
    advanceTripStatus,
    initialState,
  );
  const [cancelState, cancelAction, isCanceling] = useActionState(
    cancelTrip,
    initialState,
  );

  const advanceStatuses = nextStatuses.filter((s) => s !== "canceled");
  const canCancel = nextStatuses.includes("canceled");
  const isBusy = isAdvancing || isCanceling;

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-[2px]"
        style={{ color: "#475569" }}
      >
        Trip Actions
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {advanceStatuses.length === 0 ? (
          <p className="text-xs" style={{ color: "#64748b" }}>
            No forward transitions available.
          </p>
        ) : (
          advanceStatuses.map((status) => (
            <form key={status} action={advanceAction}>
              <input type="hidden" name="tripId" value={tripId} />
              <input type="hidden" name="toStatus" value={status} />
              <button
                type="submit"
                disabled={isBusy}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
                style={{
                  background: "rgba(99,102,241,0.16)",
                  color: "#a5b4fc",
                }}
              >
                {isAdvancing
                  ? "Updating..."
                  : `Mark ${ADERO_TRIP_STATUS_LABELS[status]}`}
              </button>
            </form>
          ))
        )}
      </div>

      {canCancel && (
        <form action={cancelAction} className="mt-4 space-y-2">
          <input type="hidden" name="tripId" value={tripId} />
          <label
            className="block text-[11px] font-medium"
            style={{ color: "#94a3b8" }}
          >
            Cancel reason
          </label>
          <textarea
            name="reason"
            required
            rows={2}
            maxLength={500}
            placeholder="Why is this trip being canceled?"
            className="w-full resize-none rounded-md border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
          />
          <button
            type="submit"
            disabled={isBusy}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.2)", color: "#fda4af" }}
          >
            {isCanceling ? "Canceling..." : "Cancel Trip"}
          </button>
        </form>
      )}

      {(advanceState.error || cancelState.error) && (
        <p className="mt-3 text-xs" style={{ color: "#f87171" }}>
          {advanceState.error ?? cancelState.error}
        </p>
      )}
      {(advanceState.success || cancelState.success) && (
        <p className="mt-3 text-xs" style={{ color: "#4ade80" }}>
          {advanceState.success ?? cancelState.success}
        </p>
      )}
    </div>
  );
}
