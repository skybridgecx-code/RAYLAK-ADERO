import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ADERO_INCIDENT_CATEGORY_LABELS,
  ADERO_INCIDENT_SEVERITY_LABELS,
  ADERO_INCIDENT_STATUS_LABELS,
} from "@raylak/shared";
import { requireAderoUser } from "@/lib/auth";
import { getIncidentById } from "@/lib/incidents";

export const metadata: Metadata = {
  title: "Incident Detail - Adero",
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

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toCoord(value: string | null): string {
  if (!value) return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numeric.toFixed(5);
}

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAderoUser().catch(() => notFound());
  const incident = await getIncidentById(id);

  if (!incident) {
    notFound();
  }

  if (user.role !== "admin" && incident.reportedByUserId !== user.id) {
    notFound();
  }

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
    <div className="space-y-6">
      <div>
        <Link
          href="/app/incidents"
          className="text-xs transition-opacity hover:opacity-80"
          style={{ color: "#475569" }}
        >
          ← Back to incidents
        </Link>
        <h1 className="mt-2 text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          {incident.title}
        </h1>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
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

        <div className="mt-4 space-y-2 text-sm" style={{ color: "#cbd5e1" }}>
          <p>{incident.description}</p>
          <p>
            <span style={{ color: "#64748b" }}>Status:</span> {statusLabel}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Location:</span> {incident.location ?? "—"}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Coordinates:</span>{" "}
            {toCoord(incident.latitude)}, {toCoord(incident.longitude)}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Reported:</span> {formatDate(incident.createdAt)}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Updated:</span> {formatDate(incident.updatedAt)}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Resolved:</span> {formatDate(incident.resolvedAt)}
          </p>
          {incident.adminNotes && (
            <p>
              <span style={{ color: "#64748b" }}>Admin notes:</span> {incident.adminNotes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
