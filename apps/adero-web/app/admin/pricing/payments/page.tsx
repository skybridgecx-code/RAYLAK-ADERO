import type { Metadata } from "next";
import { getAllPayments } from "../actions";

export const metadata: Metadata = {
  title: "Payments - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const PAYMENT_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending: { bg: "rgba(234,179,8,0.15)", color: "#fde68a" },
  processing: { bg: "rgba(59,130,246,0.15)", color: "#93c5fd" },
  succeeded: { bg: "rgba(34,197,94,0.15)", color: "#86efac" },
  failed: { bg: "rgba(239,68,68,0.15)", color: "#fda4af" },
  refunded: { bg: "rgba(168,85,247,0.15)", color: "#d8b4fe" },
  disputed: { bg: "rgba(249,115,22,0.15)", color: "#fdba74" },
};

function formatMoney(value: string): string {
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

function truncate(value: string | null): string {
  if (!value) return "N/A";
  if (value.length <= 22) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

export default async function AdminPaymentsPage() {
  const payments = await getAllPayments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Payments
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          All recorded payment attempts and manual settlements.
        </p>
      </div>

      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {[
                  "Invoice",
                  "Method",
                  "Status",
                  "Amount",
                  "Payment Intent",
                  "Processed",
                  "Created",
                ].map((label) => (
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
              {payments.map((payment) => {
                const style =
                  PAYMENT_STATUS_STYLES[payment.status] ?? PAYMENT_STATUS_STYLES["pending"];
                return (
                  <tr
                    key={payment.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: "#cbd5e1" }}>
                      {payment.invoiceNumber}
                    </td>
                    <td className="px-3 py-2 uppercase" style={{ color: "#cbd5e1" }}>
                      {payment.method}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                        style={style}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: "#e2e8f0" }}>
                      {formatMoney(payment.amount)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: "#94a3b8" }}>
                      {truncate(payment.stripePaymentIntentId)}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                      {formatDate(payment.processedAt)}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                      {formatDate(payment.createdAt)}
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm" style={{ color: "#64748b" }}>
                    No payments found.
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
