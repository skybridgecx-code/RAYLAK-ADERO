"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  acceptOffer,
  declineOffer,
  type OperatorWorkflowActionState,
} from "./actions";

const initialState: OperatorWorkflowActionState = {
  error: null,
  success: null,
  tripId: null,
};

export function OfferResponseControls({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [acceptState, acceptAction, isAccepting] = useActionState(
    acceptOffer,
    initialState,
  );
  const [declineState, declineAction, isDeclining] = useActionState(
    declineOffer,
    initialState,
  );

  useEffect(() => {
    if (acceptState.success || declineState.success) {
      router.refresh();
    }
  }, [acceptState.success, declineState.success, router]);

  const isBusy = isAccepting || isDeclining;
  const error = acceptState.error ?? declineState.error;
  const success = acceptState.success ?? declineState.success;
  const tripId = acceptState.tripId;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <form action={acceptAction}>
          <input type="hidden" name="offerId" value={offerId} />
          <button
            type="submit"
            disabled={isBusy}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
            style={{ background: "rgba(34,197,94,0.16)", color: "#86efac" }}
          >
            {isAccepting ? "Accepting..." : "Accept Offer"}
          </button>
        </form>

        <form action={declineAction}>
          <input type="hidden" name="offerId" value={offerId} />
          <button
            type="submit"
            disabled={isBusy}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.18)", color: "#fca5a5" }}
          >
            {isDeclining ? "Declining..." : "Decline"}
          </button>
        </form>
      </div>

      {error && (
        <p className="text-xs" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs" style={{ color: "#4ade80" }}>
          {success}
        </p>
      )}
      {tripId && (
        <Link
          href={`/app/operator/trips/${tripId}`}
          className="inline-block text-xs font-medium"
          style={{ color: "#a5b4fc" }}
        >
          Open created trip →
        </Link>
      )}
    </div>
  );
}
