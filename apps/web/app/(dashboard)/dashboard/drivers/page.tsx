import type { Metadata } from "next";
import Link from "next/link";
import { createServerCaller } from "~/lib/trpc/server";

export const metadata: Metadata = { title: "Drivers" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function DriversPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const search = getString(sp["search"]);
  const isActiveParam = getString(sp["isActive"]);
  const isActive = isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;
  const page = Number(getString(sp["page"]) ?? "1") || 1;

  const caller = await createServerCaller();
  const result = await caller.driver.list({ search, isActive, page, limit: 20 });
  const totalPages = Math.ceil(result.total / result.limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0c1830]">Drivers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{result.total} total</p>
        </div>
        <Link
          href="/dashboard/drivers/new"
          className="rounded bg-[#0c1830] px-4 py-2 text-sm text-white font-medium hover:bg-[#0e2040] transition-colors"
        >
          + Add Driver
        </Link>
      </div>

      <form method="GET" action="/dashboard/drivers" className="bg-white rounded-lg border border-gray-100 p-4 flex flex-wrap gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search name or email…"
          className="rounded border border-gray-200 px-3 py-2 text-sm flex-1 min-w-[180px] focus:border-[#c9a96e] focus:outline-none"
        />
        <select
          name="isActive"
          defaultValue={isActiveParam ?? ""}
          className="rounded border border-gray-200 px-3 py-2 text-sm focus:border-[#c9a96e] focus:outline-none"
        >
          <option value="">All</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
        <button type="submit" className="rounded bg-[#0c1830] px-4 py-2 text-sm text-white font-medium hover:bg-[#0e2040] transition-colors">
          Filter
        </button>
      </form>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        {result.items.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No drivers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Driver", "License", "Default Vehicle", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {result.items.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#0c1830]">{d.firstName ?? ""} {d.lastName ?? ""}</p>
                      <p className="text-xs text-gray-400">{d.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {d.licenseNumber ?? "—"}{d.licenseState ? ` · ${d.licenseState}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {d.vehicleMake && d.vehicleModel ? `${d.vehicleMake} ${d.vehicleModel}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`rounded border px-2 py-0.5 text-xs font-medium ${d.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                          {d.isActive ? "Active" : "Inactive"}
                        </span>
                        {d.isVerified && (
                          <span className="rounded border bg-blue-50 text-blue-700 border-blue-200 px-2 py-0.5 text-xs font-medium">Verified</span>
                        )}
                        {d.isOnline && (
                          <span className="rounded border bg-teal-50 text-teal-700 border-teal-200 px-2 py-0.5 text-xs font-medium">Online</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/drivers/${d.id}`} className="text-xs text-[#c9a96e] hover:underline">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          {page > 1 && <Link href={`/dashboard/drivers?page=${page - 1}`} className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">← Prev</Link>}
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={`/dashboard/drivers?page=${page + 1}`} className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">Next →</Link>}
        </div>
      )}
    </div>
  );
}
