"use client";

import { useActionState } from "react";
import { sendRenewalOutreach, type RenewalOutreachState } from "./renewal-actions";

const initialState: RenewalOutreachState = { error: null, sent: false };

export function RenewalOutreachButton({
  memberType,
  profileId,
  memberEmail,
  isTokenExpired,
}: {
  memberType: "company" | "operator";
  profileId: string;
  memberEmail: string;
  isTokenExpired: boolean;
}) {
  const [state, action, isPending] = useActionState(sendRenewalOutreach, initialState);

  if (state.sent) {
    return (
      <p className="text-[11px]" style={{ color: "#4ade80" }}>
        Renewal outreach sent to <span style={{ color: "#94a3b8" }}>{memberEmail}</span>.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {isTokenExpired ? (
        <p className="text-[11px]" style={{ color: "#64748b" }}>
          Portal link expired — rotate token on member profile before sending outreach.
        </p>
      ) : (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="memberType" value={memberType} />
          <input type="hidden" name="profileId" value={profileId} />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
            style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
          >
            {isPending ? "Sending…" : "Send renewal outreach"}
          </button>
          <span className="text-[11px]" style={{ color: "#334155" }}>
            → {memberEmail}
          </span>
        </form>
      )}
      {state.error && (
        <p className="text-[11px]" style={{ color: "#f87171" }}>
          {state.error}
        </p>
      )}
    </div>
  );
}
