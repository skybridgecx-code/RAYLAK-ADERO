import type { Metadata } from "next";
import Link from "next/link";
import { ADERO_DISPUTE_CATEGORY_LABELS, ADERO_DISPUTE_STATUS_LABELS } from "@raylak/shared";
import { requireAderoUser } from "@/lib/auth";
import { getDisputesForUser } from "@/lib/disputes";

export const metadata: Metadata = {
  title: "Disputes - Adero",
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

function formatDate(value: Date): string {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DisputesPage() {
  const user = await requireAderoUser();
  const disputes = await getDisputesForUser(user.id);
  const entryPoint = user.role === "operator" ? "/app/operator" : "/app/requester";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            Disputes
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Track billing, service, and trip quality issues.
          </p>
        </div>
        <Link
          href={entryPoint}
          className="rounded-lg px-3 py-2 text-xs font-medium"
          style={{ background: "rgba(99,102,241,0.16)", color: "#a5b4fc" }}
        >
          File from Trip Page
        </Link>
      </div>

      {disputes.length === 0 ? (
        <div
          className="rounded-xl border px-5 py-10 text-center"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            No disputes yet.
          </p>
          <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
            You can file disputes from completed or canceled trip detail pages.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {disputes.map((dispute) => {
            const style = STATUS_STYLES[dispute.status] ?? STATUS_STYLES["open"];
            const statusLabel =
              ADERO_DISPUTE_STATUS_LABELS[
                dispute.status as keyof typeof ADERO_DISPUTE_STATUS_LABELS
              ] ?? dispute.status;
            const categoryLabel =
              ADERO_DISPUTE_CATEGORY_LABELS[
                dispute.category as keyof typeof ADERO_DISPUTE_CATEGORY_LABELS
              ] ?? dispute.category;

            return (
              <Link
                key={dispute.id}
                href={`/app/disputes/${dispute.id}`}
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
                        style={style}
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
                      {dispute.subject}
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: "#64748b" }}>
                    {formatDate(dispute.createdAt)}
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
