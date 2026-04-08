import type { Metadata } from "next";
import { getAllInvoices } from "../actions";
import { InvoiceRowActions } from "./invoice-row-actions";

export const metadata: Metadata = {
  title: "Invoices - Adero Admin",
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

export default async function AdminInvoicesPage() {
  const invoices = await getAllInvoices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Invoices
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Issued invoice ledger with payment and exception handling controls.
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
                  "Requester",
                  "Operator",
                  "Status",
                  "Total",
                  "Paid",
                  "Due Date",
                  "Created",
                  "Actions",
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
              {invoices.map((invoice) => {
                const style =
                  INVOICE_STATUS_STYLES[invoice.status] ?? INVOICE_STATUS_STYLES["draft"];

                return (
                  <tr
                    key={invoice.id}
                    className="border-b align-top last:border-b-0"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: "#cbd5e1" }}>
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {invoice.requesterEmail}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {invoice.operatorEmail}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                        style={style}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: "#e2e8f0" }}>
                      {formatMoney(invoice.totalAmount)}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#e2e8f0" }}>
                      {formatMoney(invoice.paidAmount)}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                      {formatDate(invoice.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <InvoiceRowActions invoiceId={invoice.id} status={invoice.status} />
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm" style={{ color: "#64748b" }}>
                    No invoices found.
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
