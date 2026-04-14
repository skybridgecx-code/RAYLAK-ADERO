import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ADERO_DISPUTE_CATEGORY_LABELS,
  ADERO_DISPUTE_PRIORITY_LABELS,
  ADERO_DISPUTE_STATUS_LABELS,
} from "@raylak/shared";
import { requireAderoUser } from "@/lib/auth";
import { getDisputeById, getDisputeMessages } from "@/lib/disputes";
import { DisputeThread } from "@/components/dispute-thread";

export const metadata: Metadata = {
  title: "Dispute Detail - Adero",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

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

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAderoUser().catch(() => notFound());
  const [dispute, messages] = await Promise.all([
    getDisputeById(id),
    getDisputeMessages(id),
  ]);

  if (!dispute) {
    notFound();
  }

  const canView =
    user.role === "admin"
    || dispute.filedByUserId === user.id
    || dispute.filedAgainstUserId === user.id;

  if (!canView) {
    notFound();
  }

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
  const statusStyle = STATUS_STYLES[dispute.status] ?? STATUS_STYLES["open"];
  const priorityStyle = PRIORITY_STYLES[dispute.priority] ?? PRIORITY_STYLES["medium"];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/app/disputes"
          className="text-xs transition-opacity hover:opacity-80"
          style={{ color: "#475569" }}
        >
          ← Back to disputes
        </Link>
        <h1 className="mt-2 text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          {dispute.subject}
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
            style={statusStyle}
          >
            {statusLabel}
          </span>
          <span
            className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={priorityStyle}
          >
            {priorityLabel}
          </span>
          <span
            className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
          >
            {categoryLabel}
          </span>
        </div>

        <div className="mt-4 space-y-2 text-sm" style={{ color: "#cbd5e1" }}>
          <p>{dispute.description}</p>
          <p>
            <span style={{ color: "#64748b" }}>Filed:</span> {formatDate(dispute.createdAt)}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Last updated:</span> {formatDate(dispute.updatedAt)}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Resolved:</span> {formatDate(dispute.resolvedAt)}
          </p>
          {dispute.resolution && (
            <p>
              <span style={{ color: "#64748b" }}>Resolution:</span> {dispute.resolution}
            </p>
          )}
        </div>
      </div>

      <DisputeThread
        disputeId={dispute.id}
        currentUserRole={user.role}
        messages={messages.map((entry) => ({
          id: entry.id,
          senderRole: entry.senderRole,
          message: entry.message,
          createdAt: entry.createdAt,
        }))}
      />
    </div>
  );
}
