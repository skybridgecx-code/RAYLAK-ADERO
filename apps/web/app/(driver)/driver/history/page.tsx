import type { Metadata } from "next";
import Link from "next/link";
import { createServerCaller } from "~/lib/trpc/server";
import type { ServiceType } from "@raylak/shared/enums";

export const metadata: Metadata = { title: "History" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const SERVICE_LABELS: Record<ServiceType, string> = {
  airport_transfer: "Airport Transfer",
  point_to_point: "Point-to-Point",
  hourly_charter: "Hourly Charter",
  event: "Event",
  corporate: "Corporate",
  long_distance: "Long Distance",
};

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-gray-100 text-gray-600",
  canceled: "bg-red-50 text-red-500",
  no_show: "bg-orange-50 text-orange-500",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  canceled: "Canceled",
  no_show: "No Show",
};

export default async function DriverHistoryPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Number(getString(sp["page"]) ?? "1") || 1;

  const caller = await createServerCaller();
  const result = await caller.ride.history({ page, limit: 20 });

  const fmt = (d: Date | string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    }).format(new Date(d));

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Ride History</p>
      </div>

      {result.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No completed rides yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {result.items.map((ride) => {
            const customerName = `${ride.customerFirstName ?? ""} ${ride.customerLastName ?? ""}`.trim() || "Passenger";
            return (
              <Link
                key={ride.id}
                href={`/driver/rides/${ride.id}`}
                className="flex items-start justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3.5 active:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-[#0c1830]">{ride.referenceCode}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[ride.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABELS[ride.status] ?? ride.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#0c1830] mt-0.5">{customerName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{SERVICE_LABELS[ride.serviceType as ServiceType]}</p>
                  <p className="text-xs text-gray-300 mt-0.5">{fmt(ride.scheduledAt)}</p>
                </div>
                <div className="ml-3 flex-shrink-0 text-right">
                  {ride.quotedAmount && (
                    <p className="text-sm font-semibold text-[#0c1830]">${Number(ride.quotedAmount).toFixed(2)}</p>
                  )}
                  <svg className="mt-1 h-4 w-4 text-gray-300 ml-auto" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {result.items.length === result.limit && (
        <div className="flex items-center justify-center gap-4 pt-2">
          {page > 1 && (
            <Link href={`/driver/history?page=${page - 1}`} className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600">
              ← Prev
            </Link>
          )}
          {result.items.length === result.limit && (
            <Link href={`/driver/history?page=${page + 1}`} className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
