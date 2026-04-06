import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerCaller } from "@/lib/trpc/server";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Booking Confirmed — ${code}`,
    robots: { index: false },
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

const STATUS_LABELS: Record<string, string> = {
  new_request: "Pending Review",
  quoted: "Quote Sent",
  confirmed: "Confirmed",
};

export default async function ConfirmationPage({ params }: PageProps) {
  const { code } = await params;
  const caller = await createServerCaller();

  let booking: Awaited<ReturnType<typeof caller.booking.getByCode>> | null = null;
  try {
    booking = await caller.booking.getByCode({ code });
  } catch {
    notFound();
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(booking.scheduledAt));

  return (
    <>
      {/* Header */}
      <section
        className="py-20 px-4 text-center"
        style={{ background: "linear-gradient(165deg, #0c1830, #0e2040)" }}
      >
        <div className="mx-auto max-w-xl">
          {/* Check mark */}
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#c9a96e]/40">
            <span className="text-[#c9a96e] text-xl">✓</span>
          </div>
          <p className="text-[#c9a96e] text-xs tracking-[5px] uppercase font-semibold mb-3">
            Reservation Received
          </p>
          <h1 className="text-white text-3xl sm:text-4xl font-light tracking-tight">
            You&apos;re Confirmed
          </h1>
          <p className="mt-4 text-white/60 text-sm leading-relaxed">
            Your reservation is under review. You&apos;ll receive a quote and final confirmation
            via email within the hour.
          </p>
        </div>
      </section>

      {/* Details */}
      <section className="bg-white py-16 px-4">
        <div className="mx-auto max-w-xl">
          {/* Reference code */}
          <div className="rounded-lg bg-[#f7f6f4] px-8 py-8 text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-[4px] text-gray-400 mb-3">
              Reference Number
            </p>
            <p className="text-[#0c1830] text-3xl font-bold tracking-widest">
              {booking.referenceCode}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Keep this number — you&apos;ll need it to reference your booking.
            </p>
          </div>

          {/* Booking summary */}
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-[#f7f6f4] border-b border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Booking Summary
              </p>
            </div>
            <table className="w-full">
              <tbody>
                {[
                  ["Status", STATUS_LABELS[booking.status] ?? booking.status],
                  ["Service", SERVICE_LABELS[booking.serviceType] ?? booking.serviceType],
                  ["Date & Time", formattedDate],
                  ["Pickup", booking.pickupAddress],
                  ["Drop-off", booking.dropoffAddress],
                  ["Passengers", String(booking.passengerCount)],
                  ...(booking.flightNumber ? [["Flight", booking.flightNumber] as [string, string]] : []),
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-4 text-xs text-gray-400 font-medium w-1/3 align-top">
                      {label}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#0c1830] font-medium">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Next steps */}
          <div className="mt-8 rounded-lg border border-[#c9a96e]/20 bg-[#c9a96e]/5 px-6 py-6">
            <p className="text-[#0c1830] font-semibold text-sm mb-3">What Happens Next</p>
            <ol className="space-y-2">
              {[
                "Our team reviews your request (usually within the hour).",
                "You\u2019ll receive a quote confirmation by email.",
                "Reply to confirm, and your reservation is locked in.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-600">
                  <span className="text-[#c9a96e] font-semibold flex-shrink-0">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Actions */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              href={`/track/${booking.referenceCode}`}
              className="flex-1 text-center rounded bg-[#0c1830] px-6 py-3 text-sm text-white font-medium hover:bg-[#0e2040] transition-colors"
            >
              Track My Ride →
            </Link>
            <Link
              href="/"
              className="flex-1 text-center rounded border border-gray-200 px-6 py-3 text-sm text-gray-600 hover:border-gray-400 transition-colors"
            >
              Back to Home
            </Link>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            Questions? Call us at <span className="font-semibold text-gray-600">(202) 555-0100</span>
            {" "}and reference your booking number.
          </p>
        </div>
      </section>
    </>
  );
}
