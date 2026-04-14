"use client";

import { useActionState } from "react";
import {
  adminRecalculateTrust,
  type AdminTrustActionState,
} from "./actions";

type TrustRecalculateFormProps = {
  userId: string;
};

const initialState: AdminTrustActionState = {
  error: null,
  success: null,
};

export function TrustRecalculateForm({ userId }: TrustRecalculateFormProps) {
  const [state, action, isPending] = useActionState(adminRecalculateTrust, initialState);

  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50"
        style={{ background: "rgba(99,102,241,0.2)", color: "#c7d2fe" }}
      >
        {isPending ? "Recalculating..." : "Recalculate"}
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
