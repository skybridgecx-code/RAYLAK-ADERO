"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/lib/trpc/client";
import type { BookingStatus } from "@raylak/shared/enums";
import type { DriverAllowedToStatus } from "@raylak/shared/validators";

interface NextAction {
  toStatus: DriverAllowedToStatus;
  label: string;
  style: string;
}

const NEXT_ACTIONS: Partial<Record<BookingStatus, NextAction[]>> = {
  assigned: [
    { toStatus: "driver_en_route", label: "Start Trip — En Route", style: "bg-[#0c1830] text-white hover:bg-[#0e2040]" },
  ],
  driver_en_route: [
    { toStatus: "driver_arrived", label: "I Have Arrived", style: "bg-[#0c1830] text-white hover:bg-[#0e2040]" },
  ],
  driver_arrived: [
    { toStatus: "passenger_picked_up", label: "Passenger On Board", style: "bg-[#0c1830] text-white hover:bg-[#0e2040]" },
    { toStatus: "no_show", label: "No Show", style: "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200" },
  ],
  passenger_picked_up: [
    { toStatus: "completed", label: "Complete Ride", style: "bg-emerald-600 text-white hover:bg-emerald-700" },
  ],
};

interface RideStatusButtonProps {
  bookingId: string;
  currentStatus: BookingStatus;
}

export function RideStatusButton({ bookingId, currentStatus }: RideStatusButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const advance = trpc.ride.advanceStatus.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const actions = NEXT_ACTIONS[currentStatus];

  if (!actions || actions.length === 0) return null;

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <button
          key={action.toStatus}
          onClick={() => {
            setError(null);
            advance.mutate({ bookingId, toStatus: action.toStatus });
          }}
          disabled={advance.isPending}
          className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors disabled:opacity-50 ${action.style}`}
        >
          {advance.isPending ? "Updating…" : action.label}
        </button>
      ))}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-100">{error}</p>
      )}
    </div>
  );
}
