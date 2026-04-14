import type { Metadata } from "next";
import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { aderoPlatformFees, db } from "@raylak/db";
import { requireAderoUser } from "@/lib/auth";
import { getMyInvoices } from "@/app/app/invoices/actions";
import { getStripeAccountStatus } from "./actions";
import { StripeOnboardingButton } from "@/components/stripe-onboarding-button";
import { PLATFORM_FEE_PERCENT } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Payments & Earnings - Adero",
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

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

export default async function OperatorPaymentsPage() {
  const aderoUser = await requireAderoUser();
  if (aderoUser.role !== "operator") {
    throw new Error("Forbidden.");
  }

  let stripeStatusError: string | null = null;
  const [stripeStatus, invoices] = await Promise.all([
    getStripeAccountStatus().catch((error) => {
      stripeStatusError = error instanceof Error ? error.message : "Unable to load Stripe account status.";
      return null;
    }),
    getMyInvoices(),
  ]);

  const invoiceIds = invoices.map((invoice) => invoice.id);
  const feeRows =
    invoiceIds.length > 0
      ? await db
          .select({
            invoiceId: aderoPlatformFees.invoiceId,
            feePercent: aderoPlatformFees.feePercent,
            feeAmount: aderoPlatformFees.feeAmount,
          })
          .from(aderoPlatformFees)
          .where(inArray(aderoPlatformFees.invoiceId, invoiceIds))
          .orderBy(desc(aderoPlatformFees.createdAt))
      : [];

  const feeByInvoiceId = new Map<string, { feePercent: number; feeAmount: number }>();
  for (const row of feeRows) {
    if (!feeByInvoiceId.has(row.invoiceId)) {
      feeByInvoiceId.set(row.invoiceId, {
        feePercent: toNumber(row.feePercent),
        feeAmount: toNumber(row.feeAmount),
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/app/operator"
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: "#475569" }}
        >
          ← Back to operator dashboard
        </Link>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Payments & Earnings
        </h1>
        <p className="text-sm" style={{ color: "#64748b" }}>
          Manage payout onboarding and view trip invoice earnings.
        </p>
      </div>

      <section
        className="rounded-xl border p-5"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Stripe Account Status
        </p>

        {stripeStatusError && (
          <p className="mt-3 text-sm" style={{ color: "#fda4af" }}>
            {stripeStatusError}
          </p>
        )}

        {!stripeStatus ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              Set up your payment account to receive payments.
            </p>
            <StripeOnboardingButton />
          </div>
        ) : stripeStatus.onboardingComplete ? (
          <div className="mt-3">
            <span
              className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide"
              style={{ background: "rgba(34,197,94,0.15)", color: "#86efac" }}
            >
              Payment account active ✓
            </span>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="space-y-1 text-sm" style={{ color: "#cbd5e1" }}>
              <p>Charges enabled: {stripeStatus.chargesEnabled ? "✓" : "✗"}</p>
              <p>Payouts enabled: {stripeStatus.payoutsEnabled ? "✓" : "✗"}</p>
              <p>Details submitted: {stripeStatus.detailsSubmitted ? "✓" : "✗"}</p>
            </div>
            <StripeOnboardingButton />
          </div>
        )}
      </section>

      <section
        className="rounded-xl border p-5"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          My Trip Invoices / Earnings
        </p>

        {invoices.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "#94a3b8" }}>
            No earnings yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  {["Invoice", "Status", "Total", "Platform Fee", "Estimated Payout", "Due", "Paid"].map(
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
                  const totalAmount = toNumber(invoice.totalAmount);
                  const fee = feeByInvoiceId.get(invoice.id);
                  const feePercent = fee?.feePercent ?? PLATFORM_FEE_PERCENT;
                  const feeAmount = fee?.feeAmount ?? toMoney(totalAmount * feePercent);
                  const payout = toMoney(Math.max(0, totalAmount - feeAmount));

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
                      <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                        {`Platform fee: ${(feePercent * 100).toFixed(0)}% (${formatMoney(feeAmount)})`}
                      </td>
                      <td className="px-3 py-2" style={{ color: "#86efac" }}>
                        {formatMoney(payout)}
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                        {formatDate(invoice.paidAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
