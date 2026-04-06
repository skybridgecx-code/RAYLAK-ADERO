import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerCaller } from "~/lib/trpc/server";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { BookingQuoteForm } from "@/components/dashboard/booking-quote-form";
import { BookingConfirmButton } from "@/components/dashboard/booking-confirm-button";
import { BookingAssignForm } from "@/components/dashboard/booking-assign-form";
import { BookingCancelForm } from "@/components/dashboard/booking-cancel-form";
import { BOOKING_STATUS_TRANSITIONS } from "@raylak/shared/enums";
import type { ServiceType } from "@raylak/shared/enums";

interface PageProps {
  params: Promise<{ id: string }>;
}

const SERVICE_LABELS: Record<ServiceType, string> = {
  airport_transfer: "Airport Transfer",
  point_to_point: "Point-to-Point",
  hourly_charter: "Hourly Charter",
  event: "Event Transportation",
  corporate: "Corporate Transfer",
  long_distance: "Long Distance",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const caller = await createServerCaller();
    const b = await caller.booking.getById({ id });
    return { title: `Booking ${b.referenceCode}` };
  } catch {
    return { title: "Booking Detail" };
  }
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-5 gap-4 py-3 border-b border-gray-50 last:border-0">
      <dt className="col-span-2 text-xs text-gray-400 font-medium pt-0.5">{label}</dt>
      <dd className="col-span-3 text-sm text-[#0c1830]">{value ?? <span className="text-gray-300">—</span>}</dd>
    </div>
  );
}

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const caller = await createServerCaller();

  let booking: Awaited<ReturnType<typeof caller.booking.getById>>;
  try {
    booking = await caller.booking.getById({ id });
  } catch {
    notFound();
  }

  const fmt = (d: Date | string) =>
    new Intl.DateTimeFormat("en-US", {
      weekday: "short", month: "short", day: "numeric",
      year: "numeric", hour: "numeric", minute: "2-digit",
    }).format(new Date(d));

  const canQuote = booking.status === "new_request";
  const canConfirm = booking.status === "quoted";
  const canAssign = booking.status === "confirmed";
  const canCancel = BOOKING_STATUS_TRANSITIONS[booking.status].includes("canceled");
  const isAssigned = !!booking.assignedDriverId;

  // Fetch drivers and vehicles in parallel only when needed
  const [drivers, availableVehicles] = canAssign
    ? await Promise.all([
        caller.booking.getAvailableDrivers({ bookingId: id }),
        caller.booking.getAvailableVehicles({ bookingId: id }),
      ])
    : [[], []];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/bookings" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Bookings
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-xl font-bold font-mono text-[#0c1830]">{booking.referenceCode}</h1>
            <StatusBadge status={booking.status} />
            {booking.isPrivate && (
              <span className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">VIP</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">Received {fmt(booking.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking info */}
          <section className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Booking Details</p>
            </div>
            <dl className="px-5">
              <DetailRow label="Service Type" value={SERVICE_LABELS[booking.serviceType]} />
              <DetailRow label="Scheduled" value={fmt(booking.scheduledAt)} />
              <DetailRow label="Pickup" value={booking.pickupAddress} />
              <DetailRow label="Drop-off" value={booking.dropoffAddress} />
              <DetailRow label="Passengers" value={String(booking.passengerCount)} />
              {booking.flightNumber && <DetailRow label="Flight" value={booking.flightNumber} />}
              {booking.specialInstructions && (
                <DetailRow label="Instructions" value={booking.specialInstructions} />
              )}
              {booking.acquisitionSource && (
                <DetailRow label="Acquisition" value={booking.acquisitionSource} />
              )}
              {booking.quotedAmount && (
                <DetailRow label="Quoted" value={<span className="font-semibold">${Number(booking.quotedAmount).toFixed(2)}</span>} />
              )}
            </dl>
          </section>

          {/* Customer info */}
          <section className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Customer</p>
            </div>
            <dl className="px-5">
              <DetailRow
                label="Name"
                value={`${booking.customerFirstName ?? ""} ${booking.customerLastName ?? ""}`.trim() || "—"}
              />
              <DetailRow label="Email" value={booking.customerEmail} />
              <DetailRow label="Phone" value={booking.customerPhone} />
              {booking.customerId && (
                <DetailRow
                  label="Customer Record"
                  value={
                    <Link href={`/dashboard/customers/${booking.customerId}`} className="text-[#c9a96e] hover:underline text-xs">
                      View profile →
                    </Link>
                  }
                />
              )}
            </dl>
          </section>

          {/* Assigned driver + vehicle */}
          {isAssigned && (
            <section className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Assignment</p>
              </div>
              <dl className="px-5">
                <DetailRow
                  label="Driver"
                  value={
                    booking.assignedDriverId ? (
                      <div>
                        <p className="font-medium">
                          {`${booking.assignedDriverFirstName ?? ""} ${booking.assignedDriverLastName ?? ""}`.trim() || "—"}
                        </p>
                        {booking.assignedDriverEmail && (
                          <p className="text-xs text-gray-400">{booking.assignedDriverEmail}</p>
                        )}
                        {booking.assignedDriverPhone && (
                          <p className="text-xs text-gray-400">{booking.assignedDriverPhone}</p>
                        )}
                        <Link
                          href={`/dashboard/drivers/${booking.assignedDriverId}`}
                          className="text-xs text-[#c9a96e] hover:underline mt-0.5 inline-block"
                        >
                          View profile →
                        </Link>
                      </div>
                    ) : null
                  }
                />
                <DetailRow
                  label="Vehicle"
                  value={
                    booking.assignedVehicleId ? (
                      <div>
                        <p className="font-medium">
                          {booking.assignedVehicleYear} {booking.assignedVehicleMake} {booking.assignedVehicleModel}
                          {booking.assignedVehicleColor ? ` · ${booking.assignedVehicleColor}` : ""}
                        </p>
                        {booking.assignedVehicleLicensePlate && (
                          <p className="text-xs text-gray-400 font-mono">{booking.assignedVehicleLicensePlate}</p>
                        )}
                        <Link
                          href={`/dashboard/vehicles/${booking.assignedVehicleId}`}
                          className="text-xs text-[#c9a96e] hover:underline mt-0.5 inline-block"
                        >
                          View vehicle →
                        </Link>
                      </div>
                    ) : null
                  }
                />
              </dl>
            </section>
          )}

          {/* Cancellation detail */}
          {booking.status === "canceled" && booking.cancelReason && (
            <section className="bg-white rounded-lg border border-red-100 overflow-hidden">
              <div className="px-5 py-3 bg-red-50 border-b border-red-100">
                <p className="text-xs font-semibold uppercase tracking-widest text-red-500">Cancellation</p>
              </div>
              <dl className="px-5">
                {booking.canceledAt && (
                  <DetailRow label="Canceled at" value={fmt(booking.canceledAt)} />
                )}
                <DetailRow label="Reason" value={booking.cancelReason} />
              </dl>
            </section>
          )}

          {/* Status log */}
          {booking.statusLog.length > 0 && (
            <section className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Activity Log</p>
              </div>
              <ul className="divide-y divide-gray-50">
                {booking.statusLog.map((entry) => (
                  <li key={entry.id} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {entry.fromStatus && (
                        <span className="text-xs text-gray-400">{entry.fromStatus.replace(/_/g, " ")}</span>
                      )}
                      {entry.fromStatus && <span className="text-gray-300 text-xs">→</span>}
                      <span className="text-xs font-medium text-[#0c1830]">{entry.toStatus.replace(/_/g, " ")}</span>
                    </div>
                    {entry.note && <p className="text-xs text-gray-500 mt-1">{entry.note}</p>}
                    <p className="text-xs text-gray-300 mt-0.5">
                      {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(entry.createdAt))}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Action panel */}
        <div className="space-y-4">
          {canQuote && (
            <section className="bg-white rounded-lg border border-amber-200 overflow-hidden">
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Add Quote</p>
              </div>
              <div className="p-5">
                <BookingQuoteForm bookingId={booking.id} />
              </div>
            </section>
          )}

          {canConfirm && (
            <section className="bg-white rounded-lg border border-green-200 overflow-hidden">
              <div className="px-5 py-3 bg-green-50 border-b border-green-100">
                <p className="text-xs font-semibold uppercase tracking-widest text-green-700">Confirm Booking</p>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-500 mb-4">
                  Quote: <strong>${Number(booking.quotedAmount ?? 0).toFixed(2)}</strong>. Confirm this booking to move it to the next stage.
                </p>
                <BookingConfirmButton bookingId={booking.id} />
              </div>
            </section>
          )}

          {canAssign && (
            <section className="bg-white rounded-lg border border-blue-200 overflow-hidden">
              <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Assign Driver &amp; Vehicle</p>
              </div>
              <div className="p-5">
                <BookingAssignForm
                  bookingId={booking.id}
                  drivers={drivers}
                  vehicles={availableVehicles}
                />
              </div>
            </section>
          )}

          {canCancel && (
            <section className="bg-white rounded-lg border border-red-100 overflow-hidden">
              <div className="px-5 py-3 bg-red-50 border-b border-red-100">
                <p className="text-xs font-semibold uppercase tracking-widest text-red-500">Cancel Booking</p>
              </div>
              <div className="p-5">
                <BookingCancelForm bookingId={booking.id} />
              </div>
            </section>
          )}

          {!canQuote && !canConfirm && !canAssign && !canCancel && (
            <div className="bg-white rounded-lg border border-gray-100 p-5 text-center">
              <StatusBadge status={booking.status} />
              <p className="text-xs text-gray-400 mt-2">No actions available at this status.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
