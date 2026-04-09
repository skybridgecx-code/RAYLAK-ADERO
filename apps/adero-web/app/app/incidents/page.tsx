import type { Metadata } from "next";
import Link from "next/link";
import {
  ADERO_INCIDENT_CATEGORY_LABELS,
  ADERO_INCIDENT_SEVERITY_LABELS,
  ADERO_INCIDENT_STATUS_LABELS,
} from "@raylak/shared";
import { requireAderoUser } from "@/lib/auth";
import { getIncidentsForUser } from "@/lib/incidents";

export const metadata: Metadata = {
  title: "Incidents - Adero",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

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

export default async function IncidentsPage() {
  const user = await requireAderoUser();
  const incidents = await getIncidentsForUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Incidents
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Safety and operational incident reports submitted by you.
        </p>
      </div>

      {incidents.length === 0 ? (
        <div
          className="rounded-xl border px-5 py-10 text-center"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            No incidents reported yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
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
              <Link
                key={incident.id}
                href={`/app/incidents/${incident.id}`}
                className="block rounded-xl border p-4 transition-opacity hover:opacity-90"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={severityStyle}
                      >
                        {severityLabel}
                      </span>
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={statusStyle}
                      >
                        {statusLabel}
                      </span>
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                      >
                        {categoryLabel}
                      </span>
                    </div>
                    <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
                      {incident.title}
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: "#64748b" }}>
                    {formatDate(incident.createdAt)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
