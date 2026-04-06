import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerCaller } from "@/lib/trpc/server";
import { TrackingLive } from "./tracking-live";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Track Your Ride — ${code.toUpperCase()} | RAYLAK`,
    robots: { index: false, follow: false },
  };
}

const SERVICE_LABELS: Record<string, string> = {
  airport_transfer: "Airport Transfer",
  point_to_point: "Point-to-Point",
  hourly_charter: "Hourly Charter",
  event: "Event Transportation",
  corporate: "Corporate Transfer",
  long_distance: "Long Distance",
};

const ACTIVE_STATUSES = new Set([
  "assigned",
  "driver_en_route",
  "driver_arrived",
  "passenger_picked_up",
]);

export default async function TrackingPage({ params }: PageProps) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const caller = await createServerCaller();
  let booking: Awaited<ReturnType<typeof caller.booking.getTrackingByCode>>;
  try {
    booking = await caller.booking.getTrackingByCode({ code: upperCode });
  } catch {
    notFound();
  }

  const isActive = ACTIVE_STATUSES.has(booking.status);
  const hasDriver = Boolean(booking.driverFirstName);
  const hasVehicle = Boolean(booking.vehicleMake);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(booking.scheduledAt));

  return (
    <>
      {/* Header */}
      <section
        className="py-14 px-4 text-center"
        style={{ background: "linear-gradient(165deg, #0c1830, #0e2040)" }}
      >
        <div className="mx-auto max-w-lg">
          <p className="text-[#c9a96e] text-xs tracking-[5px] uppercase font-semibold mb-3">
            Ride Tracking
          </p>
          <h1 className="text-white text-3xl font-light tracking-tight">
            {upperCode}
          </h1>
          <p className="mt-2 text-white/50 text-sm">{formattedDate}</p>
        </div>
      </section>

      {/* Main content */}
      <section className="bg-white py-12 px-4">
        <div className="mx-auto max-w-lg space-y-8">

          {/* Real-time status panel */}
          <TrackingLive
            referenceCode={upperCode}
            initialStatus={booking.status}
          />

          {/* Driver + vehicle card — shown when assigned and active */}
          {isActive && hasDriver && (
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-3 bg-[#f7f6f4] border-b border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  Your Driver
                </p>
              </div>
              <div className="px-6 py-5">
                <p className="text-base font-semibold text-[#0c1830]">{booking.driverFirstName}</p>
                {hasVehicle && (
                  <p className="text-sm text-gray-500 mt-1">
                    {booking.vehicleColor ? `${booking.vehicleColor} ` : ""}
                    {booking.vehicleMake} {booking.vehicleModel}
                    {booking.vehicleYear ? ` (${booking.vehicleYear})` : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Trip details */}
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-3 bg-[#f7f6f4] border-b border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Trip Details
              </p>
            </div>
            <table className="w-full">
              <tbody>
                {[
                  ["Service", SERVICE_LABELS[booking.serviceType] ?? booking.serviceType],
                  ["Date & Time", formattedDate],
                  ["Pickup", booking.pickupAddress],
                  ["Drop-off", booking.dropoffAddress],
                  ["Passengers", String(booking.passengerCount)],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-4 text-xs text-gray-400 font-medium w-2/5 align-top">
                      {label}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#0c1830] font-medium">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="flex-1 text-center rounded border border-gray-200 px-5 py-2.5 text-sm text-gray-600 hover:border-gray-400 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/contact"
              className="flex-1 text-center rounded bg-[#0c1830] px-5 py-2.5 text-sm text-white font-medium hover:bg-[#0e2040] transition-colors"
            >
              Contact Us
            </Link>
          </div>

          <p className="text-center text-xs text-gray-400">
            Need help? Call <span className="font-semibold text-gray-600">(202) 555-0100</span>
          </p>
        </div>
      </section>
    </>
  );
}
