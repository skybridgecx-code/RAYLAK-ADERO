import type { Metadata } from "next";
import { getAllQuotes } from "../actions";

export const metadata: Metadata = {
  title: "Quotes - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const QUOTE_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft: { bg: "rgba(148,163,184,0.15)", color: "#cbd5e1" },
  sent: { bg: "rgba(59,130,246,0.15)", color: "#93c5fd" },
  approved: { bg: "rgba(34,197,94,0.15)", color: "#86efac" },
  rejected: { bg: "rgba(239,68,68,0.15)", color: "#fda4af" },
  expired: { bg: "rgba(234,179,8,0.15)", color: "#fde68a" },
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

export default async function AdminQuotesPage() {
  const quotes = await getAllQuotes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Quotes
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          All generated trip quotes with request route context.
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
                  "Request",
                  "Status",
                  "Total",
                  "Currency",
                  "Pickup",
                  "Dropoff",
                  "Created",
                  "Expires",
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
              {quotes.map((quote) => {
                const style = QUOTE_STATUS_STYLES[quote.status] ?? QUOTE_STATUS_STYLES["draft"];
                return (
                  <tr
                    key={quote.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: "#cbd5e1" }}>
                      {quote.requestId.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                        style={style}
                      >
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: "#e2e8f0" }}>
                      {formatMoney(quote.totalAmount)}
                    </td>
                    <td className="px-3 py-2 uppercase" style={{ color: "#94a3b8" }}>
                      {quote.currency}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {quote.pickupAddress}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {quote.dropoffAddress}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                      {formatDate(quote.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                      {formatDate(quote.expiresAt)}
                    </td>
                  </tr>
                );
              })}
              {quotes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-sm" style={{ color: "#64748b" }}>
                    No quotes found.
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
