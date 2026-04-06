import type { Metadata } from "next";
import Link from "next/link";
import { db, aderoCompanyApplications, aderoOperatorApplications } from "@raylak/db";
import type { AderoCompanyApplication, AderoOperatorApplication } from "@raylak/db";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { StatusBadge } from "~/components/status-badge";
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUSES } from "~/lib/validators";

export const metadata: Metadata = {
  title: "Applications — Adero Admin",
  robots: { index: false },
};

function fmt(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Entry =
  | { _type: "company"; data: AderoCompanyApplication }
  | { _type: "operator"; data: AderoOperatorApplication };

export default async function AdminQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp["q"] === "string" ? sp["q"].trim() : "";
  const status = typeof sp["status"] === "string" ? sp["status"] : "all";
  const type = typeof sp["type"] === "string" ? sp["type"] : "all";

  const showCompany = type !== "operator";
  const showOperator = type !== "company";

  const [companyCounts, operatorCounts, companyRows, operatorRows] = await Promise.all([
    db
      .select({ status: aderoCompanyApplications.status, n: count() })
      .from(aderoCompanyApplications)
      .groupBy(aderoCompanyApplications.status),
    db
      .select({ status: aderoOperatorApplications.status, n: count() })
      .from(aderoOperatorApplications)
      .groupBy(aderoOperatorApplications.status),
    showCompany
      ? db
          .select()
          .from(aderoCompanyApplications)
          .where(
            and(
              status !== "all" ? eq(aderoCompanyApplications.status, status) : undefined,
              q
                ? or(
                    ilike(aderoCompanyApplications.companyName, `%${q}%`),
                    ilike(aderoCompanyApplications.email, `%${q}%`),
                    ilike(aderoCompanyApplications.contactFirstName, `%${q}%`),
                    ilike(aderoCompanyApplications.contactLastName, `%${q}%`),
                  )
                : undefined,
            ),
          )
          .orderBy(desc(aderoCompanyApplications.submittedAt))
          .limit(100)
      : Promise.resolve([] as AderoCompanyApplication[]),
    showOperator
      ? db
          .select()
          .from(aderoOperatorApplications)
          .where(
            and(
              status !== "all" ? eq(aderoOperatorApplications.status, status) : undefined,
              q
                ? or(
                    ilike(aderoOperatorApplications.firstName, `%${q}%`),
                    ilike(aderoOperatorApplications.lastName, `%${q}%`),
                    ilike(aderoOperatorApplications.email, `%${q}%`),
                    ilike(aderoOperatorApplications.city, `%${q}%`),
                  )
                : undefined,
            ),
          )
          .orderBy(desc(aderoOperatorApplications.submittedAt))
          .limit(100)
      : Promise.resolve([] as AderoOperatorApplication[]),
  ]);

  // Aggregate counts per status across both tables
  const statusCounts: Record<string, number> = {};
  for (const s of APPLICATION_STATUSES) statusCounts[s] = 0;
  for (const row of [...companyCounts, ...operatorCounts]) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + row.n;
  }
  const totalAll = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  // Merge + sort
  const entries: Entry[] = [
    ...companyRows.map((d) => ({ _type: "company" as const, data: d })),
    ...operatorRows.map((d) => ({ _type: "operator" as const, data: d })),
  ].sort((a, b) => b.data.submittedAt.getTime() - a.data.submittedAt.getTime());

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Applications
        </h1>
        <p className="text-sm mt-1" style={{ color: "#475569" }}>
          {totalAll} total submitted
        </p>
      </div>

      {/* Count cards */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {APPLICATION_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin?status=${s}`}
            className="rounded-xl border p-4 transition-colors hover:border-indigo-500/40"
            style={{
              borderColor: status === s ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.07)",
              background: status === s ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
            }}
          >
            <p className="text-2xl font-light" style={{ color: "#f1f5f9" }}>
              {statusCounts[s] ?? 0}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
              {APPLICATION_STATUS_LABELS[s]}
            </p>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <form
        method="GET"
        className="flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>
            Search
          </label>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name, company, email…"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>
            Type
          </label>
          <select
            name="type"
            defaultValue={type}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          >
            <option value="all">All types</option>
            <option value="company">Companies</option>
            <option value="operator">Operators</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>
            Status
          </label>
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          >
            <option value="all">All statuses</option>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {APPLICATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "#6366f1", color: "#fff" }}
        >
          Filter
        </button>

        {(q || status !== "all" || type !== "all") && (
          <Link
            href="/admin"
            className="rounded-lg px-4 py-2 text-sm transition-colors hover:bg-white/5"
            style={{ color: "#64748b" }}
          >
            Clear
          </Link>
        )}
      </form>

      {/* Results */}
      {entries.length === 0 ? (
        <div
          className="rounded-xl border py-16 text-center"
          style={{ borderColor: "rgba(255,255,255,0.07)", color: "#475569" }}
        >
          <p className="text-sm">No applications match your filters.</p>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden divide-y"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
          }}
        >
          {entries.map((entry) => {
            const href =
              entry._type === "company"
                ? `/admin/company/${entry.data.id}`
                : `/admin/operator/${entry.data.id}`;

            const name =
              entry._type === "company"
                ? entry.data.companyName
                : `${entry.data.firstName} ${entry.data.lastName}`;

            const sub =
              entry._type === "company"
                ? `${entry.data.contactFirstName} ${entry.data.contactLastName} · ${entry.data.email}`
                : entry.data.email;

            return (
              <Link
                key={entry.data.id}
                href={href}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
                style={{ background: "rgba(255,255,255,0.01)" }}
              >
                {/* Type badge */}
                <span
                  className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
                  style={
                    entry._type === "company"
                      ? { background: "rgba(99,102,241,0.12)", color: "#818cf8" }
                      : { background: "rgba(20,184,166,0.12)", color: "#2dd4bf" }
                  }
                >
                  {entry._type === "company" ? "Co" : "Op"}
                </span>

                {/* Name + sub */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: "#f1f5f9" }}>
                    {name}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "#475569" }}>
                    {sub}
                  </p>
                </div>

                {/* Status */}
                <StatusBadge status={entry.data.status} />

                {/* Date */}
                <p className="shrink-0 text-xs" style={{ color: "#475569" }}>
                  {fmt(entry.data.submittedAt)}
                </p>

                {/* Arrow */}
                <span style={{ color: "#334155" }}>›</span>
              </Link>
            );
          })}
        </div>
      )}

      {entries.length === 100 && (
        <p className="text-xs text-center" style={{ color: "#475569" }}>
          Showing first 100 results. Narrow your search to see more.
        </p>
      )}
    </div>
  );
}
