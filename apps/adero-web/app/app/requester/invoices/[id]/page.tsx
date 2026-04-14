import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAderoUser } from "@/lib/auth";
import { getInvoiceDetail } from "@/app/app/invoices/actions";
import { getPaymentSummaryForInvoice } from "@/lib/payment-lifecycle";

export const metadata: Metadata = {
  title: "Invoice Detail - Adero",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const INVOICE_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft: { bg: "rgba(148,163,184,0.15)", color: "#cbd5e1" },
  issued: { bg: "rgba(59,130,246,0.15)", color: "#93c5fd" },
  paid: { bg: "rgba(34,197,94,0.15)", color: "#86efac" },
  partially_paid: { bg: "rgba(234,179,8,0.15)", color: "#fde68a" },
  overdue: { bg: "rgba(239,68,68,0.15)", color: "#fda4af" },
  canceled: { bg: "rgba(148,163,184,0.15)", color: "#cbd5e1" },
  refunded: { bg: "rgba(168,85,247,0.15)", color: "#d8b4fe" },
};

const PAYMENT_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending: { bg: "rgba(234,179,8,0.15)", color: "#fde68a" },
  processing: { bg: "rgba(59,130,246,0.15)", color: "#93c5fd" },
  succeeded: { bg: "rgba(34,197,94,0.15)", color: "#86efac" },
  failed: { bg: "rgba(239,68,68,0.15)", color: "#fda4af" },
  refunded: { bg: "rgba(168,85,247,0.15)", color: "#d8b4fe" },
  disputed: { bg: "rgba(249,115,22,0.15)", color: "#fdba74" },
};

function formatMoney(value: string | number): string {
  const amount = Number(value);
  return `$${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
}

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

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function RequesterInvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, aderoUser, query] = await Promise.all([
    params,
    requireAderoUser().catch(() => notFound()),
    searchParams,
  ]);

  if (aderoUser.role !== "requester" && aderoUser.role !== "company") {
    notFound();
  }

  const detail = await getInvoiceDetail(id).catch(() => notFound());
  const paymentSummary = await getPaymentSummaryForInvoice(id).catch(() => notFound());
  const paymentComplete = query["payment"] === "complete";

  const invoiceStyle =
    INVOICE_STATUS_STYLES[detail.invoice.status] ?? INVOICE_STATUS_STYLES["draft"];
  const remaining = paymentSummary.remainingAmount;
  const canPay = detail.invoice.status === "issued" || detail.invoice.status === "overdue";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/app/requester/invoices"
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: "#475569" }}
        >
          ← Back to invoices
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            Invoice #{detail.invoice.invoiceNumber}
          </h1>
          <span
            className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide"
            style={invoiceStyle}
          >
            {detail.invoice.status}
          </span>
        </div>
      </div>

      {paymentComplete && (
        <div
          className="rounded-lg border px-4 py-2 text-sm"
          style={{
            borderColor: "rgba(34,197,94,0.3)",
            background: "rgba(34,197,94,0.1)",
            color: "#86efac",
          }}
        >
          Payment submitted! It may take a moment to process.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
            Billing Summary
          </p>

          <div className="mt-3 space-y-2 text-sm" style={{ color: "#cbd5e1" }}>
            <div className="flex items-center justify-between">
              <span style={{ color: "#94a3b8" }}>Subtotal</span>
              <span>{formatMoney(detail.invoice.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "#94a3b8" }}>Tax</span>
              <span>{formatMoney(detail.invoice.taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <span style={{ color: "#94a3b8" }}>Total</span>
              <span>{formatMoney(detail.invoice.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "#94a3b8" }}>Paid</span>
              <span>{formatMoney(detail.invoice.paidAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "#94a3b8" }}>Remaining</span>
              <span>{formatMoney(remaining)}</span>
            </div>
          </div>

          {detail.quote && (
            <div
              className="mt-4 rounded-lg border p-4"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(15,23,42,0.45)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#64748b" }}>
                Quote Breakdown
              </p>
              <div className="mt-2 space-y-1 text-sm" style={{ color: "#cbd5e1" }}>
                <p>Base fare: {formatMoney(detail.quote.baseFare)}</p>
                <p>Distance charge: {formatMoney(detail.quote.distanceCharge)}</p>
                <p>Time charge: {formatMoney(detail.quote.timeCharge)}</p>
                <p>Surge charge: {formatMoney(detail.quote.surgeCharge)}</p>
                <p>Tolls: {formatMoney(detail.quote.tolls)}</p>
                <p>Gratuity: {formatMoney(detail.quote.gratuity)}</p>
                <p>Discount: -{formatMoney(detail.quote.discount)}</p>
              </div>
            </div>
          )}
        </div>

        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
            Invoice Info
          </p>
          <div className="mt-3 space-y-2 text-sm" style={{ color: "#cbd5e1" }}>
            <p>
              <span style={{ color: "#94a3b8" }}>Due:</span> {formatDate(detail.invoice.dueDate)}
            </p>
            <p>
              <span style={{ color: "#94a3b8" }}>Created:</span> {formatDate(detail.invoice.createdAt)}
            </p>
            <p>
              <span style={{ color: "#94a3b8" }}>Paid at:</span> {formatDate(detail.invoice.paidAt)}
            </p>
            <p>
              <span style={{ color: "#94a3b8" }}>Currency:</span> {detail.invoice.currency.toUpperCase()}
            </p>
            {detail.platformFee && (
              <p>
                <span style={{ color: "#94a3b8" }}>Platform fee:</span>{" "}
                {toNumber(detail.platformFee.feePercent).toFixed(2)}% ({formatMoney(detail.platformFee.feeAmount)})
              </p>
            )}
            {detail.trip && (
              <p>
                <span style={{ color: "#94a3b8" }}>Trip:</span>{" "}
                <Link
                  href={`/app/requester/trips/${detail.trip.id}`}
                  className="transition-opacity hover:opacity-80"
                  style={{ color: "#a5b4fc" }}
                >
                  {detail.trip.id.slice(0, 8)}
                </Link>
              </p>
            )}
          </div>

          {canPay && (
            <Link
              href={`/app/requester/invoices/${detail.invoice.id}/pay`}
              className="mt-4 inline-block rounded-md px-3 py-2 text-sm font-medium"
              style={{ background: "rgba(34,197,94,0.2)", color: "#86efac" }}
            >
              Pay Now
            </Link>
          )}
        </div>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Payment History
        </p>

        {paymentSummary.payments.length === 0 ? (
          <p className="mt-3 text-xs" style={{ color: "#64748b" }}>
            No payment records yet.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {paymentSummary.payments.map((payment) => {
              const style = PAYMENT_STATUS_STYLES[payment.status] ?? PAYMENT_STATUS_STYLES["pending"];
              return (
                <div
                  key={payment.id}
                  className="rounded-lg border px-3 py-2"
                  style={{
                    borderColor: "rgba(255,255,255,0.08)",
                    background: "rgba(15,23,42,0.5)",
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm" style={{ color: "#e2e8f0" }}>
                        {payment.method} · {formatMoney(payment.amount)}
                      </p>
                      <p className="text-xs" style={{ color: "#64748b" }}>
                        Created: {formatDate(payment.createdAt)}
                        {payment.processedAt ? ` · Processed: ${formatDate(payment.processedAt)}` : ""}
                      </p>
                    </div>
                    <span
                      className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                      style={style}
                    >
                      {payment.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
