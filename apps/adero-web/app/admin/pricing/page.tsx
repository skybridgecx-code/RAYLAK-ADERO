import type { Metadata } from "next";
import { createPricingRule, getPricingRules } from "./actions";
import { RuleToggleButton } from "./rule-toggle-button";

export const metadata: Metadata = {
  title: "Pricing Rules - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

function formatMoney(value: string): string {
  const amount = Number(value);
  return `$${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
}

function formatDate(value: Date): string {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminPricingRulesPage() {
  const rules = await getPricingRules();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Pricing Rules
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Manage fare logic for quote generation across service tiers.
        </p>
      </div>

      <section
        className="rounded-xl border p-5"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Add Pricing Rule
        </h2>
        <form action={createPricingRule} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            required
            name="serviceType"
            placeholder="Service type (e.g. sedan)"
            className="rounded-md border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
          />
          <select
            required
            name="pricingTier"
            defaultValue="standard"
            className="rounded-md border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
          >
            <option value="standard">standard</option>
            <option value="premium">premium</option>
            <option value="surge">surge</option>
            <option value="custom">custom</option>
          </select>
          <input
            required
            name="baseFare"
            type="number"
            step="0.01"
            min="0"
            placeholder="Base fare"
            className="rounded-md border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
          />
          <input
            required
            name="perMileRate"
            type="number"
            step="0.01"
            min="0"
            placeholder="Per mile rate"
            className="rounded-md border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
          />
          <input
            required
            name="perMinuteRate"
            type="number"
            step="0.01"
            min="0"
            placeholder="Per minute rate"
            className="rounded-md border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
          />
          <input
            required
            name="minimumFare"
            type="number"
            step="0.01"
            min="0"
            placeholder="Minimum fare"
            className="rounded-md border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
          />
          <input
            required
            name="surgeMultiplier"
            type="number"
            step="0.01"
            min="0"
            placeholder="Surge multiplier"
            defaultValue="1.00"
            className="rounded-md border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
          />
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-medium"
            style={{ background: "rgba(99,102,241,0.18)", color: "#c7d2fe" }}
          >
            Create Rule
          </button>
        </form>
      </section>

      <section
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {[
                  "Service Type",
                  "Tier",
                  "Base Fare",
                  "Per Mile",
                  "Per Minute",
                  "Minimum Fare",
                  "Surge Multiplier",
                  "Active",
                  "Effective From",
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
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b last:border-b-0"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <td className="px-3 py-2" style={{ color: "#e2e8f0" }}>
                    {rule.serviceType}
                  </td>
                  <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                    {rule.pricingTier}
                  </td>
                  <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                    {formatMoney(rule.baseFare)}
                  </td>
                  <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                    {formatMoney(rule.perMileRate)}
                  </td>
                  <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                    {formatMoney(rule.perMinuteRate)}
                  </td>
                  <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                    {formatMoney(rule.minimumFare)}
                  </td>
                  <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                    {Number(rule.surgeMultiplier).toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <RuleToggleButton ruleId={rule.id} isActive={rule.isActive} />
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                    {formatDate(rule.effectiveFrom)}
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm" style={{ color: "#64748b" }}>
                    No pricing rules yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
