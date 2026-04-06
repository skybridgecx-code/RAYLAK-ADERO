import type { Metadata } from "next";
import Link from "next/link";
import { createServerCaller } from "~/lib/trpc/server";
import type { VehicleType } from "@raylak/shared/enums";

export const metadata: Metadata = { title: "Vehicles" };

const TYPE_LABELS: Record<VehicleType, string> = {
  sedan: "Sedan",
  suv: "SUV",
  van: "Van",
  sprinter: "Sprinter",
  limousine: "Limousine",
  bus: "Bus",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VehiclesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const search = Array.isArray(sp["search"]) ? sp["search"][0] : sp["search"];
  const isActiveParam = sp["isActive"];
  const isActive = isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;
  const page = Number(sp["page"] ?? "1") || 1;

  const caller = await createServerCaller();
  const result = await caller.vehicle.list({ search, isActive, page, limit: 20 });
  const totalPages = Math.ceil(result.total / result.limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0c1830]">Vehicles</h1>
          <p className="text-sm text-gray-500 mt-0.5">{result.total} total</p>
        </div>
        <Link
          href="/dashboard/vehicles/new"
          className="rounded bg-[#0c1830] px-4 py-2 text-sm text-white font-medium hover:bg-[#0e2040] transition-colors"
        >
          + Add Vehicle
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" action="/dashboard/vehicles" className="bg-white rounded-lg border border-gray-100 p-4 flex flex-wrap gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search make, model, plate…"
          className="rounded border border-gray-200 px-3 py-2 text-sm flex-1 min-w-[180px] focus:border-[#c9a96e] focus:outline-none"
        />
        <select
          name="isActive"
          defaultValue={isActiveParam ?? ""}
          className="rounded border border-gray-200 px-3 py-2 text-sm focus:border-[#c9a96e] focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
        <button type="submit" className="rounded bg-[#0c1830] px-4 py-2 text-sm text-white font-medium hover:bg-[#0e2040] transition-colors">
          Filter
        </button>
      </form>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        {result.items.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No vehicles found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Vehicle", "Type", "Plate", "Capacity", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {result.items.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#0c1830]">{v.year} {v.make} {v.model}</p>
                      {v.color && <p className="text-xs text-gray-400">{v.color}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{TYPE_LABELS[v.type] ?? v.type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.licensePlate}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {v.capacity} pax{v.luggageCapacity ? ` · ${v.luggageCapacity} bags` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${v.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {v.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/vehicles/${v.id}`} className="text-xs text-[#c9a96e] hover:underline">
                        Edit
                      </Link>
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
          {page > 1 && (
            <Link href={`/dashboard/vehicles?page=${page - 1}`} className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">← Prev</Link>
          )}
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`/dashboard/vehicles?page=${page + 1}`} className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">Next →</Link>
          )}
        </div>
      )}
    </div>
  );
}
