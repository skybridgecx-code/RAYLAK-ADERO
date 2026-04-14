"use client";

import { useActionState } from "react";
import { sendDisputeMessage, type DisputeActionState } from "@/app/app/disputes/actions";

type DisputeThreadMessage = {
  id: string;
  senderRole: string;
  message: string;
  createdAt: Date | string;
};

type DisputeThreadProps = {
  disputeId: string;
  messages: DisputeThreadMessage[];
  currentUserRole: string;
};

const initialState: DisputeActionState = {
  error: null,
  success: null,
};

function formatTimestamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function roleLabel(role: string): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function DisputeThread({
  disputeId,
  messages,
  currentUserRole,
}: DisputeThreadProps) {
  const [state, action, isPending] = useActionState(sendDisputeMessage, initialState);
  const ordered = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
        Dispute Thread
      </p>

      <div className="mt-4 space-y-3">
        {ordered.length === 0 ? (
          <div
            className="rounded-lg border px-3 py-4 text-xs"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
              color: "#94a3b8",
            }}
          >
            No messages yet.
          </div>
        ) : (
          ordered.map((entry) => {
            const isMine = entry.senderRole === currentUserRole;
            return (
              <div
                key={entry.id}
                className="rounded-lg border p-3"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: isMine ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1px]"
                    style={{
                      borderColor: "rgba(255,255,255,0.12)",
                      color: isMine ? "#a5b4fc" : "#cbd5e1",
                    }}
                  >
                    {roleLabel(entry.senderRole)}
                  </span>
                  <span className="text-[11px]" style={{ color: "#64748b" }}>
                    {formatTimestamp(entry.createdAt)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "#e2e8f0" }}>
                  {entry.message}
                </p>
              </div>
            );
          })
        )}
      </div>

      <form action={action} className="mt-5 space-y-3">
        <input type="hidden" name="disputeId" value={disputeId} />
        <div>
          <label className="block text-[11px] font-medium" style={{ color: "#94a3b8" }}>
            Reply
          </label>
          <textarea
            name="message"
            required
            rows={3}
            maxLength={5000}
            className="mt-1 w-full resize-none rounded-md border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#f1f5f9",
            }}
            placeholder="Write your message"
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
          className="rounded-md px-4 py-2 text-xs font-medium transition-opacity disabled:opacity-50"
          style={{
            background: "rgba(99,102,241,0.16)",
            color: "#a5b4fc",
          }}
        >
          {isPending ? "Sending..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}
