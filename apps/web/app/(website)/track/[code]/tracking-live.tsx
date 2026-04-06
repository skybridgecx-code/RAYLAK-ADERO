"use client";

import { useEffect, useState } from "react";
import { useRealtimeTracking } from "~/hooks/use-realtime-tracking";

const STATUS_LABELS: Record<string, string> = {
  new_request: "Pending Review",
  quoted: "Quote Sent",
  confirmed: "Confirmed — Assigning Driver",
  assigned: "Driver Assigned",
  driver_en_route: "Driver En Route",
  driver_arrived: "Driver Arrived",
  passenger_picked_up: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
  no_show: "No Show",
};

const ACTIVE_STATUSES = new Set([
  "assigned",
  "driver_en_route",
  "driver_arrived",
  "passenger_picked_up",
]);

const STATUS_STEPS = [
  "confirmed",
  "assigned",
  "driver_en_route",
  "driver_arrived",
  "passenger_picked_up",
  "completed",
];

interface Props {
  referenceCode: string;
  initialStatus: string;
}

export function TrackingLive({ referenceCode, initialStatus }: Props) {
  const { latestEvent, connected } = useRealtimeTracking(referenceCode);
  const [currentStatus, setCurrentStatus] = useState(initialStatus);

  useEffect(() => {
    if (latestEvent?.toStatus) {
      setCurrentStatus(latestEvent.toStatus);
    }
  }, [latestEvent]);

  const isActive = ACTIVE_STATUSES.has(currentStatus);
  const isCompleted = currentStatus === "completed";
  const isCanceled = currentStatus === "canceled" || currentStatus === "no_show";
  const currentStepIdx = STATUS_STEPS.indexOf(currentStatus);

  return (
    <div className="space-y-6">
      {/* Live indicator */}
      {connected && (
        <div className="flex items-center gap-2 text-xs text-teal-600">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          Live updates active
        </div>
      )}

      {/* Current status badge */}
      <div className={`rounded-lg px-6 py-5 text-center ${
        isCanceled
          ? "bg-red-50 border border-red-100"
          : isCompleted
          ? "bg-teal-50 border border-teal-100"
          : isActive
          ? "bg-blue-50 border border-blue-100"
          : "bg-gray-50 border border-gray-100"
      }`}>
        <p className={`text-lg font-semibold ${
          isCanceled ? "text-red-700" : isCompleted ? "text-teal-700" : isActive ? "text-blue-700" : "text-gray-700"
        }`}>
          {STATUS_LABELS[currentStatus] ?? currentStatus}
        </p>
      </div>

      {/* Progress steps for active/post-active rides */}
      {!isCanceled && currentStepIdx >= 0 && (
        <div className="space-y-1">
          {STATUS_STEPS.map((step, i) => {
            const done = i < currentStepIdx;
            const active = i === currentStepIdx;
            return (
              <div key={step} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                  done
                    ? "bg-teal-500 text-white"
                    : active
                    ? "bg-[#0c1830] text-white"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`text-sm ${active ? "font-semibold text-[#0c1830]" : done ? "text-gray-500 line-through" : "text-gray-400"}`}>
                  {STATUS_LABELS[step]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
