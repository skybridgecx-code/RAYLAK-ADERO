import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ADERO_PENALTY_TYPE_LABELS } from "@raylak/shared";
import { db, aderoCancelPenalties, aderoUsers } from "@raylak/db";
import { PenaltyWaiveForm } from "./penalty-waive-form";

export const metadata: Metadata = {
  title: "Cancel Penalties - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const PENALTY_STYLES: Record<string, { bg: string; color: string }> = {
  none: { bg: "rgba(148,163,184,0.15)", color: "#cbd5e1" },
  fee: { bg: "rgba(239,68,68,0.15)", color: "#fda4af" },
  warning: { bg: "rgba(234,179,8,0.15)", color: "#fde68a" },
  suspension: { bg: "rgba(168,85,247,0.15)", color: "#d8b4fe" },
};

async function requireAdmin(path: string): Promise<void> {
  const secret = process.env["ADERO_ADMIN_SECRET"];
  const cookieStore = await cookies();
  const session = cookieStore.get("adero_admin")?.value;

  if (!secret || session !== secret) {
    redirect(`/admin/login?from=${encodeURIComponent(path)}`);
  }
}

function formatMoney(value: string | null, currency: string): string {
  if (!value) return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${currency.toUpperCase()} $${amount.toFixed(2)}`;
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

export default async function AdminPenaltyPage() {
  await requireAdmin("/admin/quality/penalties");

  const rows = await db
    .select({
      id: aderoCancelPenalties.id,
      userId: aderoCancelPenalties.userId,
      userEmail: aderoUsers.email,
      cancelledByRole: aderoCancelPenalties.cancelledByRole,
      penaltyType: aderoCancelPenalties.penaltyType,
      penaltyAmount: aderoCancelPenalties.penaltyAmount,
      currency: aderoCancelPenalties.currency,
      waived: aderoCancelPenalties.waived,
      waivedReason: aderoCancelPenalties.waivedReason,
      createdAt: aderoCancelPenalties.createdAt,
    })
    .from(aderoCancelPenalties)
    .innerJoin(aderoUsers, eq(aderoCancelPenalties.userId, aderoUsers.id))
    .orderBy(desc(aderoCancelPenalties.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Cancel Penalties
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Review applied penalties and execute waiver overrides when needed.
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
                  "User",
                  "Role",
                  "Type",
                  "Amount",
                  "Waived",
                  "Date",
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
              {rows.map((row) => {
                const penaltyStyle = PENALTY_STYLES[row.penaltyType] ?? PENALTY_STYLES["none"];

                return (
                  <tr
                    key={row.id}
                    className="border-b align-top last:border-b-0"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {row.userEmail}
                    </td>
                    <td className="px-3 py-2" style={{ color: "#cbd5e1" }}>
                      {row.cancelledByRole}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
                        style={penaltyStyle}
                      >
                        {ADERO_PENALTY_TYPE_LABELS[
                          row.penaltyType as keyof typeof ADERO_PENALTY_TYPE_LABELS
                        ] ?? row.penaltyType}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: "#e2e8f0" }}>
                      {formatMoney(row.penaltyAmount, row.currency)}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: row.waived ? "#86efac" : "#fda4af" }}>
                      {row.waived ? "Waived" : "No"}
                      {row.waivedReason ? ` · ${row.waivedReason}` : ""}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      {row.waived ? (
                        <span className="text-xs" style={{ color: "#64748b" }}>
                          —
                        </span>
                      ) : (
                        <PenaltyWaiveForm penaltyId={row.id} />
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm" style={{ color: "#64748b" }}>
                    No penalties recorded yet.
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
