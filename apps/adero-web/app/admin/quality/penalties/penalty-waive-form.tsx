"use client";

import { useActionState, useState } from "react";
import {
  adminWaivePenalty,
  type AdminPenaltyActionState,
} from "./actions";

type PenaltyWaiveFormProps = {
  penaltyId: string;
};

const initialState: AdminPenaltyActionState = {
  error: null,
  success: null,
};

export function PenaltyWaiveForm({ penaltyId }: PenaltyWaiveFormProps) {
  const [state, action, isPending] = useActionState(adminWaivePenalty, initialState);
  const [reason, setReason] = useState("Administrative override");

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="penaltyId" value={penaltyId} />
      <input
        name="waivedReason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="w-full rounded-md border px-2 py-1 text-xs outline-none"
        style={{
          borderColor: "rgba(255,255,255,0.1)",
          background: "#0f172a",
          color: "#f1f5f9",
        }}
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50"
        style={{ background: "rgba(34,197,94,0.2)", color: "#86efac" }}
      >
        {isPending ? "Waiving..." : "Waive"}
      </button>
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
    </form>
  );
}
