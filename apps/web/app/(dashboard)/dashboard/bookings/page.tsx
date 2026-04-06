import type { Metadata } from "next";
import Link from "next/link";
import { createServerCaller } from "~/lib/trpc/server";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { BookingStatus, ServiceType } from "@raylak/shared/enums";
import { BOOKING_STATUSES, SERVICE_TYPES } from "@raylak/shared/enums";

export const metadata: Metadata = { title: "Bookings" };

const SERVICE_LABELS: Record<ServiceType, string> = {
  airport_transfer: "Airport",
  point_to_point: "P2P",
  hourly_charter: "Charter",
  event: "Event",
  corporate: "Corporate",
  long_distance: "Long Dist.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = getString(sp["status"]) as BookingStatus | undefined;
  const serviceType = getString(sp["serviceType"]) as ServiceType | undefined;
  const search = getString(sp["search"]);
  const from = getString(sp["from"]);
  const to = getString(sp["to"]);
  const page = Number(getString(sp["page"]) ?? "1") || 1;

  const caller = await createServerCaller();
  const result = await caller.booking.list({
    status: BOOKING_STATUSES.includes(status as BookingStatus) ? status : undefined,
    serviceType: SERVICE_TYPES.includes(serviceType as ServiceType) ? serviceType : undefined,
    search: search ?? undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    page,
    limit: 20,
  });

  const totalPages = Math.ceil(result.total / result.limit);

  function buildUrl(params: Record<string, string | undefined>) {
    const base = new URLSearchParams();
    const merged = { status, serviceType, search, from, to, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) base.set(k, v); });
    return `/dashboard/bookings?${base.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0c1830]">Bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{result.total} total</p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" action="/dashboard/bookings" className="bg-white rounded-lg border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search code, name, email…"
            className="rounded border border-gray-200 px-3 py-2 text-sm focus:border-[#c9a96e] focus:outline-none"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded border border-gray-200 px-3 py-2 text-sm focus:border-[#c9a96e] focus:outline-none"
          >
            <option value="">All statuses</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            name="serviceType"
            defaultValue={serviceType ?? ""}
            className="rounded border border-gray-200 px-3 py-2 text-sm focus:border-[#c9a96e] focus:outline-none"
          >
            <option value="">All service types</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded bg-[#0c1830] px-4 py-2 text-sm text-white font-medium hover:bg-[#0e2040] transition-colors"
          >
            Filter
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-8">From</label>
            <input
              name="from"
              type="date"
              defaultValue={from}
              className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm focus:border-[#c9a96e] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-8">To</label>
            <input
              name="to"
              type="date"
              defaultValue={to}
              className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm focus:border-[#c9a96e] focus:outline-none"
            />
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        {result.items.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No bookings match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Reference", "Status", "Service", "Customer", "Pickup", "Scheduled", "Quote"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {result.items.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/bookings/${b.id}`} className="font-mono text-xs font-semibold text-[#0c1830] hover:text-[#c9a96e] transition-colors">
                        {b.referenceCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {SERVICE_LABELS[b.serviceType] ?? b.serviceType}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-[#0c1830] font-medium">
                        {b.customerFirstName ?? ""} {b.customerLastName ?? ""}
                      </p>
                      <p className="text-xs text-gray-400">{b.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px] truncate">
                      {b.pickupAddress}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(b.scheduledAt))}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {b.quotedAmount ? `$${Number(b.quotedAmount).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          {page > 1 && (
            <Link href={buildUrl({ page: String(page - 1) })} className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
              ← Prev
            </Link>
          )}
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={buildUrl({ page: String(page + 1) })} className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
