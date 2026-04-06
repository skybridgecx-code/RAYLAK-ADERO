import type { Metadata } from "next";
import Link from "next/link";
import { createServerCaller } from "~/lib/trpc/server";

export const metadata: Metadata = { title: "Overview" };

function StatCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 hover:shadow-sm transition-all block"
    >
      <div className={`h-1 w-8 rounded mb-4 ${accent}`} />
      <p className="text-3xl font-bold text-[#0c1830]">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </Link>
  );
}

export default async function DashboardOverviewPage() {
  const caller = await createServerCaller();
  const stats = await caller.dashboard.getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#0c1830]">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Live booking counts across all statuses.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="New Requests"
          value={stats.newRequests}
          href="/dashboard/bookings?status=new_request"
          accent="bg-amber-400"
        />
        <StatCard
          label="Quoted"
          value={stats.quoted}
          href="/dashboard/bookings?status=quoted"
          accent="bg-blue-400"
        />
        <StatCard
          label="Confirmed"
          value={stats.confirmed}
          href="/dashboard/bookings?status=confirmed"
          accent="bg-green-400"
        />
        <StatCard
          label="Upcoming Airport Rides"
          value={stats.upcomingAirport}
          href="/dashboard/bookings?serviceType=airport_transfer&status=confirmed"
          accent="bg-[#c9a96e]"
        />
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-[#0c1830] uppercase tracking-widest mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "View Booking Queue", href: "/dashboard/bookings" },
            { label: "Manage Vehicles", href: "/dashboard/vehicles" },
            { label: "Manage Drivers", href: "/dashboard/drivers" },
            { label: "View Customers", href: "/dashboard/customers" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded border border-gray-200 px-4 py-2 text-sm text-[#0c1830] hover:bg-gray-50 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
