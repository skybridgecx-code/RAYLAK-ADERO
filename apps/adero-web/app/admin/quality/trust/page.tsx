import type { Metadata } from "next";
import Link from "next/link";
import { requireAderoAdminPage } from "@/lib/admin-auth";
import { and, desc, eq } from "drizzle-orm";
import {
  ADERO_TRUST_TIER_LABELS,
  ADERO_TRUST_TIERS,
} from "@raylak/shared";
import { db, aderoTrustScores, aderoUsers } from "@raylak/db";
import { TrustRecalculateForm } from "./trust-recalculate-form";

export const metadata: Metadata = {
  title: "Trust Scores - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const TIER_STYLES: Record<string, { bg: string; color: string }> = {
  new: { bg: "rgba(148,163,184,0.15)", color: "#cbd5e1" },
  standard: { bg: "rgba(59,130,246,0.15)", color: "#93c5fd" },
  trusted: { bg: "rgba(20,184,166,0.15)", color: "#5eead4" },
  preferred: { bg: "rgba(34,197,94,0.15)", color: "#86efac" },
  suspended: { bg: "rgba(239,68,68,0.15)", color: "#fda4af" },
};

function formatPercent(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0.00%";
  return `${numeric.toFixed(2)}%`;
}

function formatScore(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0.00";
  return numeric.toFixed(2);
}

export default async function AdminTrustScoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAderoAdminPage("/admin/quality/trust");
  const params = await searchParams;
  const tierFilter = typeof params["tier"] === "string" ? params["tier"] : "all";

  const scores = await db
    .select({
      id: aderoTrustScores.id,
      userId: aderoTrustScores.userId,
      email: aderoUsers.email,
      tier: aderoTrustScores.tier,
      overallScore: aderoTrustScores.overallScore,
      ratingAverage: aderoTrustScores.ratingAverage,
      completionRate: aderoTrustScores.completionRate,
      cancellationRate: aderoTrustScores.cancellationRate,
      totalTrips: aderoTrustScores.totalTrips,
      updatedAt: aderoTrustScores.updatedAt,
    })
    .from(aderoTrustScores)
    .innerJoin(aderoUsers, eq(aderoTrustScores.userId, aderoUsers.id))
    .where(and(tierFilter === "all" ? undefined : eq(aderoTrustScores.tier, tierFilter as never)))
    .orderBy(desc(aderoTrustScores.overallScore), desc(aderoTrustScores.updatedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Trust Scores
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Reliability scoring across trip performance, ratings, and operational events.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/quality/trust?tier=all"
          className="rounded-md px-2.5 py-1 text-xs font-medium"
          style={{
            background: tierFilter === "all" ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)",
            color: tierFilter === "all" ? "#c7d2fe" : "#94a3b8",
          }}
        >
          All
        </Link>
        {ADERO_TRUST_TIERS.map((tier) => (
          <Link
            key={tier}
            href={`/admin/quality/trust?tier=${tier}`}
            className="rounded-md px-2.5 py-1 text-xs font-medium"
            style={{
              background:
                tierFilter === tier ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)",
              color: tierFilter === tier ? "#c7d2fe" : "#94a3b8",
            }}
          >
            {ADERO_TRUST_TIER_LABELS[tier]}
          </Link>
        ))}
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
                  "User",
                  "Tier",
                  "Overall",
                  "Rating Avg",
                  "Completion",
                  "Cancellation",
                  "Trips",
                  "Updated",
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
              {scores.map((score) => {
                const tierStyle = TIER_STYLES[score.tier] ?? TIER_STYLES["new"];

                return (
                  <tr
                    key={score.id}
                    className="border-b align-top last:border-b-0"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {score.email}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                        style={tierStyle}
                      >
                        {ADERO_TRUST_TIER_LABELS[
                          score.tier as keyof typeof ADERO_TRUST_TIER_LABELS
                        ] ?? score.tier}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: "#e2e8f0" }}>
                      {formatScore(score.overallScore)}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {formatScore(score.ratingAverage)}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {formatPercent(score.completionRate)}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {formatPercent(score.cancellationRate)}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {score.totalTrips}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                      {score.updatedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <TrustRecalculateForm userId={score.userId} />
                    </td>
                  </tr>
                );
              })}
              {scores.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-sm" style={{ color: "#64748b" }}>
                    No trust scores found for this filter.
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
