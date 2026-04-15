import type { Metadata } from "next";
import Link from "next/link";
import { requireAderoAdminPage } from "@/lib/admin-auth";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  ADERO_DISPUTE_CATEGORY_LABELS,
  ADERO_DISPUTE_PRIORITY_LABELS,
  ADERO_DISPUTE_STATUS_LABELS,
} from "@raylak/shared";
import { db, aderoUsers } from "@raylak/db";
import { getDisputeById, getDisputeMessages } from "@/lib/disputes";
import { DisputeAdminControls } from "./dispute-admin-controls";

export const metadata: Metadata = {
  title: "Dispute Detail - Adero Admin",
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

function formatSenderRole(role: string): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAderoAdminPage(`/admin/quality/disputes/${id}`);

  const [dispute, messages] = await Promise.all([
    getDisputeById(id),
    getDisputeMessages(id),
  ]);

  if (!dispute) {
    notFound();
  }

  const [filedByUser, filedAgainstUser] = await Promise.all([
    db
      .select({ email: aderoUsers.email })
      .from(aderoUsers)
      .where(eq(aderoUsers.id, dispute.filedByUserId))
      .limit(1),
    dispute.filedAgainstUserId
      ? db
          .select({ email: aderoUsers.email })
          .from(aderoUsers)
          .where(eq(aderoUsers.id, dispute.filedAgainstUserId))
          .limit(1)
      : Promise.resolve([]),
  ]);

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
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/quality/disputes"
          className="text-xs transition-opacity hover:opacity-80"
          style={{ color: "#475569" }}
        >
          ← Back to dispute queue
        </Link>
        <h1 className="mt-2 text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          {dispute.subject}
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
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
              <span style={{ color: "#64748b" }}>Filed by:</span>{" "}
              {filedByUser[0]?.email ?? dispute.filedByUserId}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Filed against:</span>{" "}
              {filedAgainstUser[0]?.email ?? dispute.filedAgainstUserId ?? "—"}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Filed:</span> {formatDate(dispute.createdAt)}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Updated:</span> {formatDate(dispute.updatedAt)}
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

        <DisputeAdminControls disputeId={dispute.id} currentStatus={dispute.status} />
      </div>

      <div
        className="rounded-xl border p-5"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Message Thread
        </p>
        {messages.length === 0 ? (
          <p className="mt-3 text-xs" style={{ color: "#64748b" }}>
            No messages yet.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {messages.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border p-3"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(15,23,42,0.5)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#cbd5e1" }}
                  >
                    {formatSenderRole(entry.senderRole)}
                  </span>
                  <span className="text-[11px]" style={{ color: "#64748b" }}>
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "#e2e8f0" }}>
                  {entry.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
