"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/lib/trpc/client";

interface BookingCancelFormProps {
  bookingId: string;
}

export function BookingCancelForm({ bookingId }: BookingCancelFormProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const cancel = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: (err) => {
      setError(err.message);
      setConfirming(false);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = reason.trim();
    if (!trimmed) { setError("A cancellation reason is required."); return; }

    if (!confirming) {
      setConfirming(true);
      return;
    }

    cancel.mutate({ bookingId, reason: trimmed });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={reason}
        onChange={(e) => { setReason(e.target.value); setConfirming(false); }}
        rows={3}
        maxLength={2000}
        placeholder="Reason for cancellation…"
        className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none resize-none"
      />

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2 border border-red-100">{error}</p>
      )}

      {confirming && !cancel.isPending && (
        <p className="text-xs text-red-700 font-medium">
          This cannot be undone. Click again to confirm cancellation.
        </p>
      )}

      <button
        type="submit"
        disabled={cancel.isPending}
        className={`w-full rounded px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
          confirming
            ? "bg-red-600 hover:bg-red-700"
            : "bg-gray-500 hover:bg-gray-600"
        }`}
      >
        {cancel.isPending
          ? "Cancelling…"
          : confirming
          ? "Confirm Cancellation"
          : "Cancel Booking"}
      </button>
    </form>
  );
}
