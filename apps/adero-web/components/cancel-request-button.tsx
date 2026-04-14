"use client";

import { useActionState, useState } from "react";
import {
  cancelRequest,
  type CancelRequestActionState,
} from "@/app/app/requester/request/cancel-actions";

type CancelRequestButtonProps = {
  requestId: string;
};

const initialState: CancelRequestActionState = {
  error: null,
  success: null,
};

export function CancelRequestButton({ requestId }: CancelRequestButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [state, action, isPending] = useActionState(cancelRequest, initialState);

  return (
    <div className="space-y-2">
      {!isConfirming ? (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          className="rounded-md px-2.5 py-1 text-xs font-medium"
          style={{ background: "rgba(239,68,68,0.15)", color: "#fda4af" }}
        >
          Cancel Request
        </button>
      ) : (
        <form action={action} className="space-y-2">
          <input type="hidden" name="requestId" value={requestId} />
          <textarea
            name="reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (optional)"
            className="w-full resize-none rounded-md border px-2 py-1 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#f1f5f9",
            }}
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50"
              style={{ background: "rgba(239,68,68,0.2)", color: "#fda4af" }}
            >
              {isPending ? "Canceling..." : "Confirm Cancel"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsConfirming(false);
                setReason("");
              }}
              className="rounded-md px-2.5 py-1 text-xs font-medium"
              style={{ background: "rgba(255,255,255,0.08)", color: "#cbd5e1" }}
            >
              Keep Request
            </button>
          </div>
        </form>
      )}

      {state.error && (
        <p className="text-[11px]" style={{ color: "#fda4af" }}>
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-[11px]" style={{ color: "#86efac" }}>
          {state.success}
        </p>
      )}
    </div>
  );
}
