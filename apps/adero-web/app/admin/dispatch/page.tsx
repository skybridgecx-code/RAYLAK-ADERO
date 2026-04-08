import type { Metadata } from "next";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  aderoOperatorAvailability,
  aderoRequestOffers,
  aderoRequests,
  aderoUsers,
} from "@raylak/db";
import {
  ADERO_REQUEST_STATUS_LABELS,
  ADERO_SERVICE_TYPE_LABELS,
  type AderoRequestStatus,
  type AderoServiceType,
} from "@raylak/db/schema";
import { requireAderoRole } from "@/lib/auth";
import { createManualOffer, triggerRequestDispatch } from "./actions";

export const metadata: Metadata = {
  title: "Dispatch - Adero Admin",
  robots: { index: false },
};

function fmtDatetime(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function operatorLabel(operator: {
  firstName: string | null;
  lastName: string | null;
  email: string;
  serviceArea: string | null;
}): string {
  const fullName = [operator.firstName, operator.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName.length > 0) {
    return operator.serviceArea
      ? `${fullName} (${operator.serviceArea})`
      : `${fullName} (${operator.email})`;
  }

  return operator.serviceArea
    ? `${operator.email} (${operator.serviceArea})`
    : operator.email;
}

const REQUEST_STATUS_STYLES: Record<AderoRequestStatus, { bg: string; color: string }> = {
  submitted: { bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
  matched: { bg: "rgba(250,204,21,0.12)", color: "#fde047" },
  accepted: { bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  in_progress: { bg: "rgba(20,184,166,0.12)", color: "#2dd4bf" },
  completed: { bg: "rgba(100,116,139,0.12)", color: "#94a3b8" },
  canceled: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
};

export default async function AdminDispatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAderoRole(["admin"]);
  const params = await searchParams;
  const notice = typeof params["notice"] === "string" ? params["notice"] : null;
  const noticeType =
    typeof params["noticeType"] === "string" ? params["noticeType"] : "info";

  const [requests, availableOperators, pendingOfferCounts] = await Promise.all([
    db
      .select()
      .from(aderoRequests)
      .where(inArray(aderoRequests.status, ["submitted", "matched"]))
      .orderBy(desc(aderoRequests.createdAt))
      .limit(100),
    db
      .select({
        id: aderoUsers.id,
        email: aderoUsers.email,
        firstName: aderoUsers.firstName,
        lastName: aderoUsers.lastName,
        serviceArea: aderoOperatorAvailability.serviceArea,
        updatedAt: aderoOperatorAvailability.updatedAt,
      })
      .from(aderoOperatorAvailability)
      .innerJoin(aderoUsers, eq(aderoOperatorAvailability.userId, aderoUsers.id))
      .where(
        and(
          eq(aderoOperatorAvailability.availabilityStatus, "available"),
          eq(aderoUsers.role, "operator"),
        ),
      )
      .orderBy(desc(aderoOperatorAvailability.updatedAt))
      .limit(200),
    db
      .select({
        requestId: aderoRequestOffers.requestId,
        pendingCount: count(),
      })
      .from(aderoRequestOffers)
      .where(eq(aderoRequestOffers.status, "pending"))
      .groupBy(aderoRequestOffers.requestId),
  ]);

  const pendingByRequestId = new Map(
    pendingOfferCounts.map((row) => [row.requestId, row.pendingCount]),
  );

  const noticeStyle =
    noticeType === "success"
      ? {
          borderColor: "rgba(34,197,94,0.25)",
          background: "rgba(34,197,94,0.08)",
          color: "#86efac",
        }
      : noticeType === "error"
        ? {
            borderColor: "rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.08)",
            color: "#fda4af",
          }
        : {
            borderColor: "rgba(99,102,241,0.25)",
            background: "rgba(99,102,241,0.08)",
            color: "#a5b4fc",
          };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Dispatch
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Auto-match submitted requests to available operators and manage manual offers.
        </p>
      </div>

      {notice && (
        <div className="rounded-lg border px-4 py-2 text-sm" style={noticeStyle}>
          {notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
            Queue Requests
          </p>
          <p className="mt-1 text-2xl font-light" style={{ color: "#f1f5f9" }}>
            {requests.length}
          </p>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
            Available Operators
          </p>
          <p className="mt-1 text-2xl font-light" style={{ color: "#f1f5f9" }}>
            {availableOperators.length}
          </p>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
            Pending Offers
          </p>
          <p className="mt-1 text-2xl font-light" style={{ color: "#f1f5f9" }}>
            {pendingOfferCounts.reduce((sum, row) => sum + row.pendingCount, 0)}
          </p>
        </div>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Available Operators
        </p>
        {availableOperators.length === 0 ? (
          <p className="mt-3 text-xs" style={{ color: "#64748b" }}>
            No operators currently marked available.
          </p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {availableOperators.map((operator) => (
              <div
                key={operator.id}
                className="rounded-lg border px-3 py-2"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(15,23,42,0.55)",
                }}
              >
                <p className="text-sm" style={{ color: "#e2e8f0" }}>
                  {operatorLabel(operator)}
                </p>
                <p className="text-[11px]" style={{ color: "#64748b" }}>
                  Updated: {fmtDatetime(operator.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Dispatch Queue
        </p>
        {requests.length === 0 ? (
          <div
            className="rounded-xl border px-5 py-6"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-sm" style={{ color: "#64748b" }}>
              No submitted or matched requests in queue.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((request) => {
              const status = request.status as AderoRequestStatus;
              const statusStyle = REQUEST_STATUS_STYLES[status] ?? REQUEST_STATUS_STYLES.submitted;
              const statusLabel = ADERO_REQUEST_STATUS_LABELS[status] ?? request.status;
              const serviceLabel =
                ADERO_SERVICE_TYPE_LABELS[request.serviceType as AderoServiceType] ??
                request.serviceType;
              const pendingOffers = pendingByRequestId.get(request.id) ?? 0;

              return (
                <div
                  key={request.id}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: "rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={statusStyle}
                        >
                          {statusLabel}
                        </span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                        >
                          {serviceLabel}
                        </span>
                        <span className="text-[11px]" style={{ color: "#64748b" }}>
                          Pending offers: {pendingOffers}
                        </span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
                        {request.pickupAddress}
                        <span style={{ color: "#475569" }}> → </span>
                        {request.dropoffAddress}
                      </p>
                      <p className="text-xs" style={{ color: "#64748b" }}>
                        Pickup: {fmtDatetime(request.pickupAt)} · {request.passengerCount}{" "}
                        {request.passengerCount === 1 ? "passenger" : "passengers"}
                      </p>
                    </div>

                    <div className="w-full space-y-2 sm:w-80">
                      <form action={triggerRequestDispatch} className="flex">
                        <input type="hidden" name="requestId" value={request.id} />
                        <button
                          type="submit"
                          className="w-full rounded-md px-3 py-1.5 text-xs font-medium"
                          style={{ background: "rgba(99,102,241,0.2)", color: "#c7d2fe" }}
                        >
                          Run Auto Dispatch
                        </button>
                      </form>

                      <form action={createManualOffer} className="flex gap-2">
                        <input type="hidden" name="requestId" value={request.id} />
                        <select
                          name="operatorId"
                          required
                          disabled={availableOperators.length === 0}
                          className="min-w-0 flex-1 rounded-md border px-2 py-1.5 text-xs outline-none disabled:opacity-50"
                          style={{
                            borderColor: "rgba(255,255,255,0.1)",
                            background: "#0f172a",
                            color: "#e2e8f0",
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Select operator
                          </option>
                          {availableOperators.map((operator) => (
                            <option key={operator.id} value={operator.id}>
                              {operatorLabel(operator)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          disabled={availableOperators.length === 0}
                          className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                          style={{ background: "rgba(34,197,94,0.2)", color: "#86efac" }}
                        >
                          Offer
                        </button>
                      </form>
                    </div>
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
