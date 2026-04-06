import type { Metadata } from "next";
import Link from "next/link";
import { createServerCaller } from "~/lib/trpc/server";

export const metadata: Metadata = { title: "Customers" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const search = getString(sp["search"]);
  const page = Number(getString(sp["page"]) ?? "1") || 1;

  const caller = await createServerCaller();
  const result = await caller.customer.list({ search, page, limit: 20 });
  const totalPages = Math.ceil(result.total / result.limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0c1830]">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{result.total} total</p>
        </div>
      </div>

      <form method="GET" action="/dashboard/customers" className="bg-white rounded-lg border border-gray-100 p-4 flex gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search name, email, or phone…"
          className="rounded border border-gray-200 px-3 py-2 text-sm flex-1 focus:border-[#c9a96e] focus:outline-none"
        />
        <button type="submit" className="rounded bg-[#0c1830] px-4 py-2 text-sm text-white font-medium hover:bg-[#0e2040] transition-colors">
          Search
        </button>
      </form>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        {result.items.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Customer", "Phone", "Status", "Since", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {result.items.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#0c1830]">{c.firstName ?? ""} {c.lastName ?? ""}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${c.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(c.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/customers/${c.id}`} className="text-xs text-[#c9a96e] hover:underline">View</Link>
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
          {page > 1 && <Link href={`/dashboard/customers?page=${page - 1}`} className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">← Prev</Link>}
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={`/dashboard/customers?page=${page + 1}`} className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">Next →</Link>}
        </div>
      )}
    </div>
  );
}
