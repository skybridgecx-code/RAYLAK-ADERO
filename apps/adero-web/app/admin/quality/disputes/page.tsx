import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  ADERO_DISPUTE_CATEGORY_LABELS,
  ADERO_DISPUTE_PRIORITY_LABELS,
  ADERO_DISPUTE_STATUS_LABELS,
  ADERO_DISPUTE_STATUSES,
} from "@raylak/shared";
import { db, aderoDisputes } from "@raylak/db";

export const metadata: Metadata = {
  title: "Dispute Queue - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["open", "under_review", "escalated"] as const;

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  open: { bg: "rgba(59,130,246,0.15)", color: "#93c5fd" },
  under_review: { bg: "rgba(234,179,8,0.15)", color: "#fde68a" },
  escalated: { bg: "rgba(239,68,68,0.15)", color: "#fda4af" },
  resolved: { bg: "rgba(34,197,94,0.15)", color: "#86efac" },
  dismissed: { bg: "rgba(148,163,184,0.15)", color: "#cbd5e1" },
};

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  low: { bg: "rgba(148,163,184,0.15)", color: "#cbd5e1" },
  medium: { bg: "rgba(59,130,246,0.15)", color: "#93c5fd" },
  high: { bg: "rgba(234,179,8,0.15)", color: "#fde68a" },
  critical: { bg: "rgba(239,68,68,0.15)", color: "#fda4af" },
};

async function requireAdmin(path: string): Promise<void> {
  const secret = process.env["ADERO_ADMIN_SECRET"];
  const cookieStore = await cookies();
  const session = cookieStore.get("adero_admin")?.value;

  if (!secret || session !== secret) {
    redirect(`/admin/login?from=${encodeURIComponent(path)}`);
  }
}

function formatDate(value: Date): string {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDisputeQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin("/admin/quality/disputes");
  const params = await searchParams;
  const statusFilter = typeof params["status"] === "string" ? params["status"] : "active";

  const whereClause =
    statusFilter === "all"
      ? undefined
      : statusFilter === "active"
        ? inArray(aderoDisputes.status, [...ACTIVE_STATUSES])
        : eq(aderoDisputes.status, statusFilter as never);

  const disputes = await db
    .select()
    .from(aderoDisputes)
    .where(and(whereClause))
    .orderBy(desc(aderoDisputes.priority), desc(aderoDisputes.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            Dispute Queue
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Review and resolve rider and operator disputes.
          </p>
        </div>
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
            <option value="active">Open / Under Review / Escalated</option>
            <option value="all">All statuses</option>
            {ADERO_DISPUTE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ADERO_DISPUTE_STATUS_LABELS[status]}
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
                {["Subject", "Category", "Priority", "Status", "Filed", "Actions"].map((label) => (
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
              {disputes.map((dispute) => {
                const statusStyle = STATUS_STYLES[dispute.status] ?? STATUS_STYLES["open"];
                const priorityStyle = PRIORITY_STYLES[dispute.priority] ?? PRIORITY_STYLES["medium"];
                const statusLabel =
                  ADERO_DISPUTE_STATUS_LABELS[
                    dispute.status as keyof typeof ADERO_DISPUTE_STATUS_LABELS
                  ] ?? dispute.status;
                const categoryLabel =
                  ADERO_DISPUTE_CATEGORY_LABELS[
                    dispute.category as keyof typeof ADERO_DISPUTE_CATEGORY_LABELS
                  ] ?? dispute.category;
                const priorityLabel =
                  ADERO_DISPUTE_PRIORITY_LABELS[
                    dispute.priority as keyof typeof ADERO_DISPUTE_PRIORITY_LABELS
                  ] ?? dispute.priority;

                return (
                  <tr
                    key={dispute.id}
                    className="border-b align-top last:border-b-0"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <td className="px-3 py-2" style={{ color: "#e2e8f0" }}>
                      {dispute.subject}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {categoryLabel}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                        style={priorityStyle}
                      >
                        {priorityLabel}
                      </span>
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
                      {formatDate(dispute.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/quality/disputes/${dispute.id}`}
                        className="text-xs font-medium"
                        style={{ color: "#a5b4fc" }}
                      >
                        View Detail →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {disputes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm" style={{ color: "#64748b" }}>
                    No disputes found for this filter.
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
