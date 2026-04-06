import type { Metadata } from "next";
import Link from "next/link";
import { createServerCaller } from "~/lib/trpc/server";
import { AvailabilityToggle } from "@/components/driver/availability-toggle";
import type { ServiceType, DriverAvailabilityStatus } from "@raylak/shared/enums";

export const metadata: Metadata = { title: "Queue" };

const SERVICE_LABELS: Record<ServiceType, string> = {
  airport_transfer: "Airport Transfer",
  point_to_point: "Point-to-Point",
  hourly_charter: "Hourly Charter",
  event: "Event",
  corporate: "Corporate",
  long_distance: "Long Distance",
};

const STATUS_LABELS: Record<string, { label: string; dot: string }> = {
  assigned: { label: "Assigned", dot: "bg-blue-400" },
  driver_en_route: { label: "En Route", dot: "bg-amber-400" },
  driver_arrived: { label: "Arrived", dot: "bg-emerald-400" },
  passenger_picked_up: { label: "Passenger On Board", dot: "bg-emerald-500" },
};

function fmtPickup(d: Date | string) {
  const date = new Date(d);
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  if (isToday) return `Today · ${time}`;
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export default async function DriverHomePage() {
  const caller = await createServerCaller();

  const [me, queue] = await Promise.all([
    caller.ride.me(),
    caller.ride.myQueue(),
  ]);

  const active = queue.filter(
    (r) => r.status === "driver_en_route" || r.status === "driver_arrived" || r.status === "passenger_picked_up",
  );
  const upcoming = queue.filter((r) => r.status === "assigned");

  const driverName = `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() || "Driver";

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Driver header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Welcome back</p>
          <p className="text-base font-semibold text-[#0c1830]">{driverName}</p>
        </div>
        <AvailabilityToggle current={(me.availabilityStatus as DriverAvailabilityStatus) ?? "offline"} />
      </div>

      {/* Active ride (at most one should exist) */}
      {active.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Active</p>
          <div className="space-y-2">
            {active.map((ride) => {
              const meta = STATUS_LABELS[ride.status] ?? { label: ride.status, dot: "bg-gray-400" };
              return (
                <Link
                  key={ride.id}
                  href={`/driver/rides/${ride.id}`}
                  className="block rounded-2xl border border-[#0c1830]/10 bg-[#0c1830] p-4 text-white shadow-sm active:opacity-90"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                      <span className="text-xs font-medium text-white/70">{meta.label}</span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-[#c9a96e]">{ride.referenceCode}</span>
                  </div>
                  <p className="text-sm font-semibold">
                    {`${ride.customerFirstName ?? ""} ${ride.customerLastName ?? ""}`.trim() || "Passenger"}
                  </p>
                  <p className="text-xs text-white/60 mt-0.5">{fmtPickup(ride.scheduledAt)}</p>
                  <div className="mt-3 grid grid-cols-1 gap-0.5">
                    <p className="text-xs text-white/80 truncate">↑ {ride.pickupAddress}</p>
                    <p className="text-xs text-white/60 truncate">↓ {ride.dropoffAddress}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming queue */}
      {upcoming.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Upcoming — {upcoming.length} ride{upcoming.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {upcoming.map((ride) => (
              <Link
                key={ride.id}
                href={`/driver/rides/${ride.id}`}
                className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm active:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#0c1830] truncate">
                      {`${ride.customerFirstName ?? ""} ${ride.customerLastName ?? ""}`.trim() || "Passenger"}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {SERVICE_LABELS[ride.serviceType as ServiceType]}
                    </span>
                  </div>
                  <p className="text-xs text-[#c9a96e] font-medium mt-0.5">{fmtPickup(ride.scheduledAt)}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{ride.pickupAddress}</p>
                </div>
                <svg className="ml-3 h-4 w-4 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {queue.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No rides assigned</p>
          <p className="text-xs text-gray-400 mt-1">Your dispatcher will assign rides here.</p>
        </div>
      )}
    </div>
  );
}
