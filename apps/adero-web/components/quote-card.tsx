"use client";

import type { AderoQuote } from "@raylak/db/schema";

type QuoteCardProps = {
  quote: AderoQuote;
  onApprove?: () => void | Promise<void>;
  onReject?: () => void | Promise<void>;
  showActions?: boolean;
  isPending?: boolean;
  pendingAction?: "approve" | "reject" | null;
};

const QUOTE_STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: "rgba(148,163,184,0.15)", color: "#cbd5e1", label: "Draft" },
  sent: { bg: "rgba(99,102,241,0.15)", color: "#a5b4fc", label: "Sent" },
  approved: { bg: "rgba(34,197,94,0.15)", color: "#86efac", label: "Approved" },
  rejected: { bg: "rgba(239,68,68,0.15)", color: "#fda4af", label: "Rejected" },
  expired: { bg: "rgba(234,179,8,0.15)", color: "#fde68a", label: "Expired" },
};

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: string | number | null | undefined): string {
  return `$${toNumber(value).toFixed(2)}`;
}

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasPositive(value: string | number | null | undefined): boolean {
  return toNumber(value) > 0;
}

export function QuoteCard({
  quote,
  onApprove,
  onReject,
  showActions = false,
  isPending = false,
  pendingAction = null,
}: QuoteCardProps) {
  const statusStyle = QUOTE_STATUS_STYLES[quote.status] ?? {
    bg: "rgba(148,163,184,0.15)",
    color: "#cbd5e1",
    label: quote.status,
  };

  const isActionable = quote.status === "sent" || quote.status === "draft";
  const currency = quote.currency.toUpperCase();

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[2px]" style={{ color: "#64748b" }}>
            Quote #{quote.id.slice(0, 8)}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: "#475569" }}>
            Expires: {formatDate(quote.expiresAt)}
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase"
          style={{ background: statusStyle.bg, color: statusStyle.color }}
        >
          {statusStyle.label}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm" style={{ color: "#cbd5e1" }}>
        <div className="flex items-center justify-between">
          <span style={{ color: "#94a3b8" }}>Base fare</span>
          <span>{formatMoney(quote.baseFare)}</span>
        </div>

        {hasPositive(quote.distanceCharge) && (
          <div className="flex items-center justify-between">
            <span style={{ color: "#94a3b8" }}>Distance charge</span>
            <span>{formatMoney(quote.distanceCharge)}</span>
          </div>
        )}

        {hasPositive(quote.timeCharge) && (
          <div className="flex items-center justify-between">
            <span style={{ color: "#94a3b8" }}>Time charge</span>
            <span>{formatMoney(quote.timeCharge)}</span>
          </div>
        )}

        {hasPositive(quote.surgeCharge) && (
          <div className="flex items-center justify-between">
            <span style={{ color: "#94a3b8" }}>Surge charge</span>
            <span>{formatMoney(quote.surgeCharge)}</span>
          </div>
        )}

        {hasPositive(quote.tolls) && (
          <div className="flex items-center justify-between">
            <span style={{ color: "#94a3b8" }}>Tolls</span>
            <span>{formatMoney(quote.tolls)}</span>
          </div>
        )}

        {hasPositive(quote.gratuity) && (
          <div className="flex items-center justify-between">
            <span style={{ color: "#94a3b8" }}>Gratuity</span>
            <span>{formatMoney(quote.gratuity)}</span>
          </div>
        )}

        {hasPositive(quote.discount) && (
          <div className="flex items-center justify-between">
            <span style={{ color: "#94a3b8" }}>Discount</span>
            <span style={{ color: "#86efac" }}>-{formatMoney(quote.discount)}</span>
          </div>
        )}

        <div className="mt-1 border-t pt-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <span style={{ color: "#94a3b8" }}>Subtotal</span>
            <span>{formatMoney(quote.subtotal)}</span>
          </div>
          {hasPositive(quote.taxAmount) && (
            <div className="mt-1 flex items-center justify-between">
              <span style={{ color: "#94a3b8" }}>Tax</span>
              <span>{formatMoney(quote.taxAmount)}</span>
            </div>
          )}
        </div>
      </div>

      <div
        className="mt-4 rounded-lg border px-4 py-3"
        style={{ borderColor: "rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.08)" }}
      >
        <p className="text-xs uppercase tracking-[2px]" style={{ color: "#a5b4fc" }}>
          Total ({currency})
        </p>
        <p className="mt-1 text-3xl font-light" style={{ color: "#f8fafc" }}>
          {formatMoney(quote.totalAmount)}
        </p>
      </div>

      {(quote.estimatedDistanceMiles || quote.estimatedDurationMinutes) && (
        <p className="mt-3 text-xs" style={{ color: "#64748b" }}>
          {quote.estimatedDistanceMiles
            ? `${toNumber(quote.estimatedDistanceMiles).toFixed(2)} miles`
            : "Distance TBD"}
          {" · "}
          {quote.estimatedDurationMinutes
            ? `${quote.estimatedDurationMinutes} minutes`
            : "Duration TBD"}
        </p>
      )}

      {quote.notes && (
        <p className="mt-2 text-sm" style={{ color: "#94a3b8" }}>
          {quote.notes}
        </p>
      )}

      {showActions && isActionable && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void onApprove?.();
            }}
            disabled={!onApprove || isPending}
            className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ background: "rgba(34,197,94,0.2)", color: "#86efac" }}
          >
            {isPending && pendingAction === "approve" ? "Approving…" : "Approve Quote"}
          </button>
          <button
            type="button"
            onClick={() => {
              void onReject?.();
            }}
            disabled={!onReject || isPending}
            className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.2)", color: "#fda4af" }}
          >
            {isPending && pendingAction === "reject" ? "Declining…" : "Decline Quote"}
          </button>
        </div>
      )}
    </div>
  );
}
