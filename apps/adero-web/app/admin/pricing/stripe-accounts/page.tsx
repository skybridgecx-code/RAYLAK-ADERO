import type { Metadata } from "next";
import { getOperatorStripeAccounts } from "../actions";

export const metadata: Metadata = {
  title: "Stripe Accounts - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

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

function truncate(value: string): string {
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}…${value.slice(-10)}`;
}

function boolMark(value: boolean): string {
  return value ? "✓" : "✗";
}

export default async function AdminStripeAccountsPage() {
  const accounts = await getOperatorStripeAccounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Stripe Accounts
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Connected operator Stripe Express account onboarding status.
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
                {["Operator", "Stripe Account", "Charges", "Payouts", "Onboarding", "Created"].map(
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
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className="border-b last:border-b-0"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                    {account.operatorEmail}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: "#cbd5e1" }}>
                    {truncate(account.stripeAccountId)}
                  </td>
                  <td className="px-3 py-2 text-center text-base" style={{ color: "#cbd5e1" }}>
                    {boolMark(account.chargesEnabled)}
                  </td>
                  <td className="px-3 py-2 text-center text-base" style={{ color: "#cbd5e1" }}>
                    {boolMark(account.payoutsEnabled)}
                  </td>
                  <td className="px-3 py-2 text-center text-base" style={{ color: "#cbd5e1" }}>
                    {boolMark(account.onboardingComplete)}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                    {formatDate(account.createdAt)}
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm" style={{ color: "#64748b" }}>
                    No operator Stripe accounts found.
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
