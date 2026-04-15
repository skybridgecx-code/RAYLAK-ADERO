import type { Metadata } from "next";
import Link from "next/link";
import { requireAderoAdminPage } from "@/lib/admin-auth";
import { count, inArray } from "drizzle-orm";
import {
  ADERO_DISPUTE_PRIORITY_LABELS,
  ADERO_INCIDENT_SEVERITY_LABELS,
} from "@raylak/shared";
import { db, aderoDisputes, aderoIncidents } from "@raylak/db";

export const metadata: Metadata = {
  title: "Quality - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminQualityDashboardPage() {
  await requireAderoAdminPage("/admin/quality");

  const [openDisputesRows, incidentRows, disputePriorityRows, incidentSeverityRows] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(aderoDisputes)
        .where(
          inArray(aderoDisputes.status, ["open", "under_review", "escalated"]),
        ),
      db.select({ value: count() }).from(aderoIncidents),
      db
        .select({
          priority: aderoDisputes.priority,
          value: count(),
        })
        .from(aderoDisputes)
        .groupBy(aderoDisputes.priority),
      db
        .select({
          severity: aderoIncidents.severity,
          value: count(),
        })
        .from(aderoIncidents)
        .groupBy(aderoIncidents.severity),
    ]);

  const openDisputes = Number(openDisputesRows[0]?.value ?? 0);
  const totalIncidents = Number(incidentRows[0]?.value ?? 0);

  const disputePriorityCounts = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const row of disputePriorityRows) {
    disputePriorityCounts[row.priority] = Number(row.value);
  }

  const incidentSeverityCounts = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const row of incidentSeverityRows) {
    incidentSeverityCounts[row.severity] = Number(row.value);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Quality Operations
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Disputes, incidents, trust scoring, and cancellation penalty controls.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[1.5px]" style={{ color: "#64748b" }}>
            Open Disputes
          </p>
          <p className="mt-1 text-2xl font-light" style={{ color: "#fda4af" }}>
            {openDisputes}
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[1.5px]" style={{ color: "#64748b" }}>
            Reported Incidents
          </p>
          <p className="mt-1 text-2xl font-light" style={{ color: "#93c5fd" }}>
            {totalIncidents}
          </p>
        </div>
        <Link
          href="/admin/quality/trust"
          className="rounded-xl border p-4 transition-opacity hover:opacity-90"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[1.5px]" style={{ color: "#64748b" }}>
            Trust Scores
          </p>
          <p className="mt-1 text-sm" style={{ color: "#cbd5e1" }}>
            View tiers and recalculate
          </p>
        </Link>
        <Link
          href="/admin/quality/penalties"
          className="rounded-xl border p-4 transition-opacity hover:opacity-90"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[1.5px]" style={{ color: "#64748b" }}>
            Cancel Penalties
          </p>
          <p className="mt-1 text-sm" style={{ color: "#cbd5e1" }}>
            Review and waive penalties
          </p>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
              Disputes by Priority
            </p>
            <Link
              href="/admin/quality/disputes"
              className="text-xs font-medium"
              style={{ color: "#a5b4fc" }}
            >
              Open queue →
            </Link>
          </div>
          <div className="space-y-2">
            {Object.entries(disputePriorityCounts).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span style={{ color: "#94a3b8" }}>
                  {ADERO_DISPUTE_PRIORITY_LABELS[
                    key as keyof typeof ADERO_DISPUTE_PRIORITY_LABELS
                  ]}
                </span>
                <span style={{ color: "#e2e8f0" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
              Incidents by Severity
            </p>
            <Link
              href="/admin/quality/incidents"
              className="text-xs font-medium"
              style={{ color: "#a5b4fc" }}
            >
              Review queue →
            </Link>
          </div>
          <div className="space-y-2">
            {Object.entries(incidentSeverityCounts).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span style={{ color: "#94a3b8" }}>
                  {ADERO_INCIDENT_SEVERITY_LABELS[
                    key as keyof typeof ADERO_INCIDENT_SEVERITY_LABELS
                  ]}
                </span>
                <span style={{ color: "#e2e8f0" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
