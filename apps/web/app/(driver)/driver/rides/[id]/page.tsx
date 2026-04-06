import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerCaller } from "~/lib/trpc/server";
import { RideStatusButton } from "@/components/driver/ride-status-button";
import type { ServiceType, BookingStatus } from "@raylak/shared/enums";

interface PageProps {
  params: Promise<{ id: string }>;
}

const SERVICE_LABELS: Record<ServiceType, string> = {
  airport_transfer: "Airport Transfer",
  point_to_point: "Point-to-Point",
  hourly_charter: "Hourly Charter",
  event: "Event",
  corporate: "Corporate",
  long_distance: "Long Distance",
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  assigned: { label: "Assigned", bg: "bg-blue-50", text: "text-blue-700" },
  driver_en_route: { label: "En Route", bg: "bg-amber-50", text: "text-amber-700" },
  driver_arrived: { label: "Arrived", bg: "bg-emerald-50", text: "text-emerald-700" },
  passenger_picked_up: { label: "On Board", bg: "bg-emerald-50", text: "text-emerald-800" },
  completed: { label: "Completed", bg: "bg-gray-50", text: "text-gray-600" },
  canceled: { label: "Canceled", bg: "bg-red-50", text: "text-red-600" },
  no_show: { label: "No Show", bg: "bg-orange-50", text: "text-orange-600" },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const caller = await createServerCaller();
    const ride = await caller.ride.getById({ id });
    return { title: `Ride ${ride.referenceCode}` };
  } catch {
    return { title: "Ride Detail" };
  }
}

export default async function RideDetailPage({ params }: PageProps) {
  const { id } = await params;
  const caller = await createServerCaller();

  let ride: Awaited<ReturnType<typeof caller.ride.getById>>;
  try {
    ride = await caller.ride.getById({ id });
  } catch {
    notFound();
  }

  const fmt = (d: Date | string) =>
    new Intl.DateTimeFormat("en-US", {
      weekday: "short", month: "short", day: "numeric",
      year: "numeric", hour: "numeric", minute: "2-digit",
    }).format(new Date(d));

  const statusCfg = STATUS_CONFIG[ride.status] ?? { label: ride.status, bg: "bg-gray-50", text: "text-gray-600" };
  const customerName = `${ride.customerFirstName ?? ""} ${ride.customerLastName ?? ""}`.trim() || "Passenger";
  const isActive = ["assigned", "driver_en_route", "driver_arrived", "passenger_picked_up"].includes(ride.status);

  return (
    <div className="pb-6">
      {/* Back + status */}
      <div className="sticky top-12 z-10 bg-gray-50 px-4 pt-3 pb-2 flex items-center justify-between">
        <Link href="/driver" className="flex items-center gap-1 text-xs text-gray-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Queue
        </Link>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
          {statusCfg.label}
        </span>
      </div>

      <div className="px-4 space-y-4 mt-2">
        {/* Reference + time */}
        <div className="rounded-2xl bg-[#0c1830] px-5 py-4 text-white">
          <p className="font-mono text-sm font-bold text-[#c9a96e]">{ride.referenceCode}</p>
          <p className="text-2xl font-semibold mt-1">{fmt(ride.scheduledAt)}</p>
          <p className="text-xs text-white/60 mt-0.5">{SERVICE_LABELS[ride.serviceType as ServiceType]}</p>
        </div>

        {/* Route */}
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-1">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-[#0c1830] bg-white" />
              <span className="mt-1 h-8 w-px bg-gray-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#0c1830]" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Pickup</p>
                <p className="text-sm text-[#0c1830] mt-0.5">{ride.pickupAddress}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Drop-off</p>
                <p className="text-sm text-[#0c1830] mt-0.5">{ride.dropoffAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Customer</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0c1830]">{customerName}</p>
              {ride.customerPhone && (
                <p className="text-xs text-gray-500 mt-0.5">{ride.customerPhone}</p>
              )}
            </div>
            {ride.customerPhone && (
              <a
                href={`tel:${ride.customerPhone.replace(/\s/g, "")}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0c1830] text-white"
                aria-label="Call customer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </a>
            )}
          </div>
          {ride.passengerCount > 1 && (
            <p className="text-xs text-gray-400 mt-2">{ride.passengerCount} passengers</p>
          )}
          {ride.flightNumber && (
            <p className="text-xs text-gray-500 mt-1">Flight: <span className="font-mono font-semibold">{ride.flightNumber}</span></p>
          )}
        </div>

        {/* Vehicle */}
        {(ride.vehicleMake || ride.vehicleLicensePlate) && (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Your Vehicle</p>
            <p className="text-sm font-semibold text-[#0c1830]">
              {ride.vehicleYear} {ride.vehicleMake} {ride.vehicleModel}
              {ride.vehicleColor ? ` · ${ride.vehicleColor}` : ""}
            </p>
            {ride.vehicleLicensePlate && (
              <p className="font-mono text-xs text-gray-500 mt-0.5">{ride.vehicleLicensePlate}</p>
            )}
            {ride.vehicleAmenities && (
              <p className="text-xs text-gray-400 mt-1">{ride.vehicleAmenities}</p>
            )}
          </div>
        )}

        {/* Instructions */}
        {ride.specialInstructions && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 mb-1">Instructions</p>
            <p className="text-sm text-amber-900">{ride.specialInstructions}</p>
          </div>
        )}

        {/* Status action */}
        {isActive && (
          <div className="pt-2">
            <RideStatusButton bookingId={ride.id} currentStatus={ride.status as BookingStatus} />
          </div>
        )}

        {/* Terminal state message */}
        {!isActive && (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 text-center">
            <p className={`text-sm font-semibold ${statusCfg.text}`}>{statusCfg.label}</p>
            <p className="text-xs text-gray-400 mt-1">This ride has ended.</p>
          </div>
        )}
      </div>
    </div>
  );
}
