import type { Metadata } from "next";
import Link from "next/link";
import { requireAderoAdminPage } from "@/lib/admin-auth";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  ADERO_INCIDENT_CATEGORY_LABELS,
  ADERO_INCIDENT_SEVERITY_LABELS,
  ADERO_INCIDENT_STATUSES,
  ADERO_INCIDENT_STATUS_LABELS,
} from "@raylak/shared";
import { db, aderoIncidents } from "@raylak/db";

export const metadata: Metadata = {
  title: "Incident Queue - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["reported", "investigating"] as const;

const SEVERITY_STYLES: Record<string, { bg: string; color: string }> = {
  low: { bg: "rgba(148,163,184,0.15)", color: "#cbd5e1" },
  medium: { bg: "rgba(59,130,246,0.15)", color: "#93c5fd" },
  high: { bg: "rgba(234,179,8,0.15)", color: "#fde68a" },
  critical: { bg: "rgba(239,68,68,0.15)", color: "#fda4af" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  reported: { bg: "rgba(59,130,246,0.15)", color: "#93c5fd" },
  investigating: { bg: "rgba(234,179,8,0.15)", color: "#fde68a" },
  action_taken: { bg: "rgba(20,184,166,0.15)", color: "#5eead4" },
  closed: { bg: "rgba(100,116,139,0.15)", color: "#cbd5e1" },
};

function formatDate(value: Date): string {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminIncidentQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAderoAdminPage("/admin/quality/incidents");
  const params = await searchParams;
  const statusFilter = typeof params["status"] === "string" ? params["status"] : "active";

  const whereClause =
    statusFilter === "all"
      ? undefined
      : statusFilter === "active"
        ? inArray(aderoIncidents.status, [...ACTIVE_STATUSES])
        : eq(aderoIncidents.status, statusFilter as never);

  const incidents = await db
    .select()
    .from(aderoIncidents)
    .where(and(whereClause))
    .orderBy(desc(aderoIncidents.severity), desc(aderoIncidents.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Incident Review Queue
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Review operational and safety incidents submitted by users.
        </p>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>
            Status
          </label>
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-lg border px-3 py-2 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#f1f5f9",
            }}
          >
            <option value="active">Reported / Investigating</option>
            <option value="all">All statuses</option>
            {ADERO_INCIDENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ADERO_INCIDENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-xs font-medium"
          style={{ background: "rgba(99,102,241,0.18)", color: "#c7d2fe" }}
        >
          Apply
        </button>
      </form>

      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {["Title", "Severity", "Category", "Status", "Date", "Actions"].map((label) => (
                  <th
                    key={label}
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[1.5px]"
                    style={{ color: "#64748b" }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => {
                const severityStyle = SEVERITY_STYLES[incident.severity] ?? SEVERITY_STYLES["medium"];
                const statusStyle = STATUS_STYLES[incident.status] ?? STATUS_STYLES["reported"];
                const severityLabel =
                  ADERO_INCIDENT_SEVERITY_LABELS[
                    incident.severity as keyof typeof ADERO_INCIDENT_SEVERITY_LABELS
                  ] ?? incident.severity;
                const categoryLabel =
                  ADERO_INCIDENT_CATEGORY_LABELS[
                    incident.category as keyof typeof ADERO_INCIDENT_CATEGORY_LABELS
                  ] ?? incident.category;
                const statusLabel =
                  ADERO_INCIDENT_STATUS_LABELS[
                    incident.status as keyof typeof ADERO_INCIDENT_STATUS_LABELS
                  ] ?? incident.status;

                return (
                  <tr
                    key={incident.id}
                    className="border-b align-top last:border-b-0"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <td className="px-3 py-2" style={{ color: "#e2e8f0" }}>
                      {incident.title}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                        style={severityStyle}
                      >
                        {severityLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {categoryLabel}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                        style={statusStyle}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                      {formatDate(incident.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/quality/incidents/${incident.id}`}
                        className="text-xs font-medium"
                        style={{ color: "#a5b4fc" }}
                      >
                        View Detail →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {incidents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm" style={{ color: "#64748b" }}>
                    No incidents found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
