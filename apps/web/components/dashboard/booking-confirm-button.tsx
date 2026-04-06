"use client";

import { useRouter } from "next/navigation";
import { trpc } from "~/lib/trpc/client";

interface Props {
  bookingId: string;
}

export function BookingConfirmButton({ bookingId }: Props) {
  const router = useRouter();

  const mutation = trpc.booking.confirm.useMutation({
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="space-y-3">
      {mutation.error && (
        <p className="text-sm text-red-600">{mutation.error.message}</p>
      )}
      {mutation.isSuccess && (
        <p className="text-sm text-green-600 font-medium">Booking confirmed.</p>
      )}
      <button
        onClick={() => mutation.mutate({ bookingId })}
        disabled={mutation.isPending}
        className="rounded bg-green-600 px-6 py-2.5 text-sm text-white font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending ? "Confirming…" : "Confirm Booking"}
      </button>
    </div>
  );
}
