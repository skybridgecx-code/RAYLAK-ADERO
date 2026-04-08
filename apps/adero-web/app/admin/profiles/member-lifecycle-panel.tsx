"use client";

import { useActionState, useState } from "react";
import type { ProfileStatus } from "~/lib/validators";
import { PROFILE_STATUS_LABELS } from "~/lib/validators";
import { setMemberLifecycleStatus, type LifecycleActionState } from "./lifecycle-actions";

const initialState: LifecycleActionState = { error: null, saved: false };

type Transition = {
  newStatus: ProfileStatus;
  label: string;
  description: string;
  confirmLabel: string;
  danger: boolean;
};

function getTransitions(currentStatus: ProfileStatus): Transition[] {
  switch (currentStatus) {
    case "active":
      return [
        {
          newStatus: "paused",
          label: "Pause member",
          description: "Temporarily suspend the member. They can be reactivated at any time.",
          confirmLabel: "Yes, pause member",
          danger: false,
        },
        {
          newStatus: "inactive",
          label: "Deactivate member",
          description:
            "Mark the member as inactive. Use this for long-term or permanent removal from active status.",
          confirmLabel: "Yes, deactivate member",
          danger: true,
        },
      ];
    case "paused":
      return [
        {
          newStatus: "active",
          label: "Reactivate member",
          description: "Restore the member to active status.",
          confirmLabel: "Yes, reactivate member",
          danger: false,
        },
        {
          newStatus: "inactive",
          label: "Deactivate member",
          description: "Mark the member as inactive instead of paused.",
          confirmLabel: "Yes, deactivate member",
          danger: true,
        },
      ];
    case "inactive":
      return [
        {
          newStatus: "active",
          label: "Reactivate member",
          description: "Restore the member to active status.",
          confirmLabel: "Yes, reactivate member",
          danger: false,
        },
        {
          newStatus: "paused",
          label: "Set to paused",
          description: "Mark the member as paused rather than inactive.",
          confirmLabel: "Yes, set to paused",
          danger: false,
        },
      ];
  }
}

const STATUS_COLORS: Record<ProfileStatus, { bg: string; text: string }> = {
  active: { bg: "rgba(34,197,94,0.12)", text: "#4ade80" },
  paused: { bg: "rgba(250,204,21,0.12)", text: "#fde047" },
  inactive: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8" },
};

export function MemberLifecyclePanel({
  memberType,
  profileId,
  currentStatus,
}: {
  memberType: "company" | "operator";
  profileId: string;
  currentStatus: ProfileStatus;
}) {
  const [state, action, isPending] = useActionState(setMemberLifecycleStatus, initialState);
  const [confirming, setConfirming] = useState<Transition | null>(null);
  const [reason, setReason] = useState("");

  const transitions = getTransitions(currentStatus);
  const statusColor = STATUS_COLORS[currentStatus];

  function handleSelect(t: Transition) {
    setConfirming(t);
    setReason("");
  }

  function handleCancel() {
    setConfirming(null);
    setReason("");
  }

  return (
    <div
      className="h-fit rounded-xl border p-5 space-y-4"
      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[3px]" style={{ color: "#475569" }}>
          Lifecycle Controls
        </p>
        <span
          className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: statusColor.bg, color: statusColor.text }}
        >
          {PROFILE_STATUS_LABELS[currentStatus]}
        </span>
      </div>

      {state.saved ? (
        <p className="text-xs" style={{ color: "#4ade80" }}>
          Member status updated successfully.
        </p>
      ) : confirming ? (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: confirming.danger ? "#f87171" : "#94a3b8" }}>
            {confirming.description}
          </p>

          <form action={action} className="space-y-3">
            <input type="hidden" name="memberType" value={memberType} />
            <input type="hidden" name="profileId" value={profileId} />
            <input type="hidden" name="newStatus" value={confirming.newStatus} />

            <div className="space-y-1">
              <label
                htmlFor="lifecycle-reason"
                className="block text-[11px]"
                style={{ color: "#475569" }}
              >
                Reason (optional)
              </label>
              <input
                id="lifecycle-reason"
                name="reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Document compliance issue"
                className="w-full rounded-md border px-3 py-1.5 text-xs outline-none"
                style={{
                  borderColor: "rgba(255,255,255,0.1)",
                  background: "#0f172a",
                  color: "#e2e8f0",
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
                style={
                  confirming.danger
                    ? { background: "rgba(239,68,68,0.15)", color: "#f87171" }
                    : { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
                }
              >
                {isPending ? "Saving…" : confirming.confirmLabel}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-md px-3 py-1.5 text-xs transition-opacity"
                style={{ color: "#475569" }}
              >
                Cancel
              </button>
            </div>

            {state.error && (
              <p className="text-xs" style={{ color: "#f87171" }}>
                {state.error}
              </p>
            )}
          </form>
        </div>
      ) : (
        <div className="space-y-2">
          {transitions.map((t) => (
            <button
              key={t.newStatus}
              type="button"
              onClick={() => handleSelect(t)}
              className="w-full rounded-md px-3 py-2 text-left text-xs font-medium transition-opacity hover:opacity-80"
              style={
                t.danger
                  ? {
                      background: "rgba(239,68,68,0.08)",
                      color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.15)",
                    }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      color: "#94a3b8",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }
              }
            >
              {t.label}
            </button>
          ))}
          {state.error && (
            <p className="text-xs" style={{ color: "#f87171" }}>
              {state.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
