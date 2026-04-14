import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAderoUser } from "@/lib/auth";
import { getMyInvoices } from "@/app/app/invoices/actions";

export const metadata: Metadata = {
  title: "Invoices - Adero",
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

export default async function RequesterInvoicesPage() {
  const aderoUser = await requireAderoUser().catch(() => notFound());
  if (aderoUser.role !== "requester" && aderoUser.role !== "company") {
    notFound();
  }

  const invoices = await getMyInvoices();
  const backHref = aderoUser.role === "company" ? "/app/company" : "/app/requester";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={backHref}
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: "#475569" }}
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            Invoices
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Review billing status and pay outstanding balances.
          </p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div
          className="rounded-xl border px-5 py-10 text-center"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            No invoices yet.
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  {["Invoice", "Status", "Total", "Paid", "Due", "Created", "Actions"].map(
                    (label) => (
                      <th
                        key={label}
                        className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[1.5px]"
                        style={{ color: "#64748b" }}
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const style =
                    INVOICE_STATUS_STYLES[invoice.status] ?? INVOICE_STATUS_STYLES["draft"];
                  const isPayable = invoice.status === "issued" || invoice.status === "overdue";

                  return (
                    <tr
                      key={invoice.id}
                      className="border-b last:border-b-0"
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}
                    >
                      <td className="px-3 py-2 font-mono text-xs" style={{ color: "#cbd5e1" }}>
                        {invoice.invoiceNumber}
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
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/app/requester/invoices/${invoice.id}`}
                            className="rounded-md px-2.5 py-1 text-xs font-medium"
                            style={{ background: "rgba(99,102,241,0.16)", color: "#a5b4fc" }}
                          >
                            View Details
                          </Link>
                          {isPayable && (
                            <Link
                              href={`/app/requester/invoices/${invoice.id}/pay`}
                              className="rounded-md px-2.5 py-1 text-xs font-medium"
                              style={{ background: "rgba(34,197,94,0.2)", color: "#86efac" }}
                            >
                              Pay Now
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
