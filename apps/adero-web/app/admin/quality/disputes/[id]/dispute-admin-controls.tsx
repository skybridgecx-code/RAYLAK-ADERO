"use client";

import { useActionState, useMemo, useState } from "react";
import {
  ADERO_DISPUTE_STATUS_LABELS,
  ADERO_DISPUTE_STATUS_TRANSITIONS,
} from "@raylak/shared";
import {
  adminSendDisputeMessage,
  adminUpdateDisputeStatus,
  type AdminDisputeActionState,
} from "../actions";

type DisputeAdminControlsProps = {
  disputeId: string;
  currentStatus: string;
};

const initialState: AdminDisputeActionState = {
  error: null,
  success: null,
};

export function DisputeAdminControls({
  disputeId,
  currentStatus,
}: DisputeAdminControlsProps) {
  const [statusState, statusAction, statusPending] = useActionState(
    adminUpdateDisputeStatus,
    initialState,
  );
  const [messageState, messageAction, messagePending] = useActionState(
    adminSendDisputeMessage,
    initialState,
  );
  const transitions = useMemo(
    () =>
      ADERO_DISPUTE_STATUS_TRANSITIONS[
        currentStatus as keyof typeof ADERO_DISPUTE_STATUS_TRANSITIONS
      ] ?? [],
    [currentStatus],
  );
  const [nextStatus, setNextStatus] = useState<string>(transitions[0] ?? currentStatus);

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Status Transition
        </p>
        {transitions.length === 0 ? (
          <p className="mt-3 text-xs" style={{ color: "#64748b" }}>
            No further transitions available.
          </p>
        ) : (
          <form action={statusAction} className="mt-3 space-y-3">
            <input type="hidden" name="disputeId" value={disputeId} />
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
                    {ADERO_DISPUTE_STATUS_LABELS[status] ?? status}
                  </option>
                ))}
              </select>
            </div>
            {(nextStatus === "resolved" || nextStatus === "dismissed") && (
              <div>
                <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
                  Resolution
                </label>
                <textarea
                  name="resolution"
                  rows={3}
                  className="mt-1 w-full resize-none rounded-md border px-3 py-2 text-xs outline-none"
                  style={{
                    borderColor: "rgba(255,255,255,0.1)",
                    background: "#0f172a",
                    color: "#f1f5f9",
                  }}
                  placeholder="Resolution details"
                />
              </div>
            )}
            {statusState.error && (
              <p className="text-xs" style={{ color: "#f87171" }}>
                {statusState.error}
              </p>
            )}
            {statusState.success && (
              <p className="text-xs" style={{ color: "#4ade80" }}>
                {statusState.success}
              </p>
            )}
            <button
              type="submit"
              disabled={statusPending}
              className="rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50"
              style={{ background: "rgba(99,102,241,0.18)", color: "#c7d2fe" }}
            >
              {statusPending ? "Updating..." : "Update Status"}
            </button>
          </form>
        )}
      </div>

      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Admin Reply
        </p>
        <form action={messageAction} className="mt-3 space-y-3">
          <input type="hidden" name="disputeId" value={disputeId} />
          <textarea
            name="message"
            required
            rows={4}
            className="w-full resize-none rounded-md border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#f1f5f9",
            }}
            placeholder="Send update to participants"
          />
          {messageState.error && (
            <p className="text-xs" style={{ color: "#f87171" }}>
              {messageState.error}
            </p>
          )}
          {messageState.success && (
            <p className="text-xs" style={{ color: "#4ade80" }}>
              {messageState.success}
            </p>
          )}
          <button
            type="submit"
            disabled={messagePending}
            className="rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50"
            style={{ background: "rgba(34,197,94,0.18)", color: "#86efac" }}
          >
            {messagePending ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
}
