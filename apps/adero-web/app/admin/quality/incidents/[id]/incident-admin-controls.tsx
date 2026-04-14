"use client";

import { useActionState, useMemo, useState } from "react";
import {
  ADERO_INCIDENT_STATUS_LABELS,
  ADERO_INCIDENT_STATUS_TRANSITIONS,
} from "@raylak/shared";
import {
  adminUpdateIncidentStatus,
  type AdminIncidentActionState,
} from "../actions";

type IncidentAdminControlsProps = {
  incidentId: string;
  currentStatus: string;
};

const initialState: AdminIncidentActionState = {
  error: null,
  success: null,
};

export function IncidentAdminControls({
  incidentId,
  currentStatus,
}: IncidentAdminControlsProps) {
  const [state, action, isPending] = useActionState(
    adminUpdateIncidentStatus,
    initialState,
  );
  const transitions = useMemo(
    () =>
      ADERO_INCIDENT_STATUS_TRANSITIONS[
        currentStatus as keyof typeof ADERO_INCIDENT_STATUS_TRANSITIONS
      ] ?? [],
    [currentStatus],
  );
  const [nextStatus, setNextStatus] = useState<string>(transitions[0] ?? currentStatus);

  if (transitions.length === 0) {
    return (
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <p className="text-xs" style={{ color: "#64748b" }}>
          No further incident transitions available.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
        Incident Controls
      </p>
      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="incidentId" value={incidentId} />
        <div>
          <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
            Next status
          </label>
          <select
            name="status"
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#f1f5f9",
            }}
          >
            {transitions.map((status) => (
              <option key={status} value={status}>
                {ADERO_INCIDENT_STATUS_LABELS[status] ?? status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
            Admin notes
          </label>
          <textarea
            name="adminNotes"
            rows={4}
            className="mt-1 w-full resize-none rounded-md border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#f1f5f9",
            }}
            placeholder="Internal review notes and resolution context"
          />
        </div>
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
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50"
          style={{ background: "rgba(99,102,241,0.18)", color: "#c7d2fe" }}
        >
          {isPending ? "Updating..." : "Update Incident"}
        </button>
      </form>
    </div>
  );
}
