"use client";

import { useRealtimeDispatch } from "~/hooks/use-realtime-dispatch";
import type { RaylakEvent } from "@raylak/shared/events";

const EVENT_LABELS: Record<RaylakEvent["type"], string> = {
  "booking.status_changed": "Status changed",
  "booking.assigned": "Booking assigned",
  "driver.location_updated": "Location update",
  "driver.availability_changed": "Availability changed",
};

function EventRow({ event }: { event: RaylakEvent }) {
  const label = EVENT_LABELS[event.type];
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(event.ts));

  let detail = "";
  if (event.type === "booking.status_changed") {
    detail = `${event.referenceCode} → ${event.toStatus.replace(/_/g, " ")}`;
  } else if (event.type === "booking.assigned") {
    detail = `${event.referenceCode} dispatched`;
  } else if (event.type === "driver.availability_changed") {
    detail = `Driver → ${event.status}`;
  } else if (event.type === "driver.location_updated") {
    detail = `${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}`;
  }

  return (
    <li className="flex items-start justify-between gap-4 px-5 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#0c1830]">{label}</p>
        {detail && <p className="text-xs text-gray-400 truncate mt-0.5">{detail}</p>}
      </div>
      <span className="flex-shrink-0 text-[10px] text-gray-300 pt-0.5 font-mono">{time}</span>
    </li>
  );
}

/**
 * Live operational event feed for the dispatcher dashboard.
 * Renders null if NEXT_PUBLIC_REALTIME_URL is not configured.
 */
export function LiveEventFeed() {
  const realtimeUrl = process.env["NEXT_PUBLIC_REALTIME_URL"];
  const { events, connected } = useRealtimeDispatch();

  // Don't render if realtime is not configured
  if (!realtimeUrl) return null;

  return (
    <section className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full flex-shrink-0 ${
            connected ? "bg-emerald-400 animate-pulse" : "bg-gray-300"
          }`}
        />
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Live Feed
        </p>
        <span className="ml-auto text-[10px] text-gray-400">
          {connected ? "Connected" : "Connecting…"}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="px-5 py-5 text-xs text-gray-400 text-center">
          Waiting for events…
        </p>
      ) : (
        <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
          {events.map((e, i) => (
            <EventRow key={i} event={e} />
          ))}
        </ul>
      )}
    </section>
  );
}
