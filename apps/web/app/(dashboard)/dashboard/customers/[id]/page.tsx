import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerCaller } from "~/lib/trpc/server";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { ServiceType } from "@raylak/shared/enums";

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const caller = await createServerCaller();
    const c = await caller.customer.getById({ id });
    return { title: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email };
  } catch {
    return { title: "Customer" };
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

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const caller = await createServerCaller();

  let customer: Awaited<ReturnType<typeof caller.customer.getById>>;
  try {
    customer = await caller.customer.getById({ id });
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/dashboard/customers" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Customers
        </Link>
        <h1 className="text-xl font-semibold text-[#0c1830] mt-2">
          {`${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || customer.email}
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">{customer.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="md:col-span-1">
          <section className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Profile</p>
            </div>
            <dl className="px-5">
              <DetailRow label="Name" value={`${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "—"} />
              <DetailRow label="Email" value={customer.email} />
              <DetailRow label="Phone" value={customer.phone} />
              <DetailRow label="Status" value={
                <span className={`rounded border px-2 py-0.5 text-xs font-medium ${customer.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  {customer.isActive ? "Active" : "Inactive"}
                </span>
              } />
              <DetailRow
                label="Member since"
                value={new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(customer.createdAt))}
              />
              <DetailRow label="Total bookings" value={String(customer.totalBookings)} />
            </dl>
          </section>
        </div>

        {/* Booking history */}
        <div className="md:col-span-2">
          <section className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Booking History</p>
              <p className="text-xs text-gray-400">Last 10 of {customer.totalBookings}</p>
            </div>
            {customer.bookingHistory.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No bookings yet.</div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {customer.bookingHistory.map((b) => (
                  <li key={b.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/dashboard/bookings/${b.id}`}
                            className="font-mono text-xs font-semibold text-[#0c1830] hover:text-[#c9a96e] transition-colors"
                          >
                            {b.referenceCode}
                          </Link>
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {SERVICE_LABELS[b.serviceType]} ·{" "}
                          {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(b.scheduledAt))}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{b.pickupAddress} → {b.dropoffAddress}</p>
                        {b.acquisitionSource && (
                          <p className="text-xs text-gray-300 mt-0.5">Source: {b.acquisitionSource}</p>
                        )}
                      </div>
                      {b.quotedAmount && (
                        <p className="text-sm font-medium text-[#0c1830] flex-shrink-0">
                          ${Number(b.quotedAmount).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
