"use client";

import { useState } from "react";
import { trpc } from "~/lib/trpc/client";
import type { DriverAvailabilityStatus } from "@raylak/shared/enums";

const STATUS_LABELS: Record<DriverAvailabilityStatus, string> = {
  available: "Available",
  on_ride: "On Ride",
  break: "Break",
  offline: "Offline",
};

const STATUS_STYLES: Record<DriverAvailabilityStatus, string> = {
  available: "bg-emerald-500 text-white border-emerald-500",
  on_ride: "bg-blue-500 text-white border-blue-500",
  break: "bg-amber-400 text-white border-amber-400",
  offline: "bg-gray-300 text-gray-700 border-gray-300",
};

interface AvailabilityToggleProps {
  current: DriverAvailabilityStatus;
}

export function AvailabilityToggle({ current }: AvailabilityToggleProps) {
  const [status, setStatus] = useState<DriverAvailabilityStatus>(current);
  const [open, setOpen] = useState(false);

  const setAvailability = trpc.ride.setAvailability.useMutation({
    onSuccess: () => { setOpen(false); },
    onError: () => { /* revert optimistic update */ setStatus(current); },
  });

  function select(s: DriverAvailabilityStatus) {
    setStatus(s); // optimistic
    setAvailability.mutate({ status: s });
  }

  const options: DriverAvailabilityStatus[] = ["available", "on_ride", "break", "offline"];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${STATUS_STYLES[status]}`}
      >
        {STATUS_LABELS[status]} ▾
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 w-36 rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => select(opt)}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                opt === status ? "font-semibold text-[#0c1830]" : "text-gray-600"
              }`}
            >
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                opt === "available" ? "bg-emerald-500"
                : opt === "on_ride" ? "bg-blue-500"
                : opt === "break" ? "bg-amber-400"
                : "bg-gray-300"
              }`} />
              {STATUS_LABELS[opt]}
            </button>
          ))}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {open && (
        <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
