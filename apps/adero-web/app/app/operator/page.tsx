import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { requireAderoRole } from "@/lib/auth";
import {
  db,
  aderoOperatorAvailability,
  aderoRequestOffers,
  aderoRequests,
  aderoTrips,
} from "@raylak/db";
import {
  ADERO_OPERATOR_AVAILABILITY_STATUS_LABELS,
  ADERO_REQUEST_STATUS_LABELS,
  ADERO_SERVICE_TYPE_LABELS,
  ADERO_TRIP_STATUS_LABELS,
  type AderoOperatorAvailabilityStatus,
  type AderoRequestStatus,
  type AderoServiceType,
  type AderoTripStatus,
} from "@raylak/db/schema";
import { AvailabilityToggle } from "./availability-toggle";
import { OfferResponseControls } from "./offer-response-controls";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operator Dashboard",
  robots: { index: false },
};

const TRIP_STATUS_STYLES: Record<AderoTripStatus, { bg: string; color: string }> = {
  assigned: { bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
  operator_en_route: { bg: "rgba(59,130,246,0.12)", color: "#60a5fa" },
  operator_arrived: { bg: "rgba(20,184,166,0.12)", color: "#2dd4bf" },
  in_progress: { bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  completed: { bg: "rgba(100,116,139,0.12)", color: "#94a3b8" },
  canceled: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
};

const REQUEST_STATUS_STYLES: Record<AderoRequestStatus, { bg: string; color: string }> = {
  submitted: { bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
  matched: { bg: "rgba(250,204,21,0.12)", color: "#fde047" },
  accepted: { bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  in_progress: { bg: "rgba(20,184,166,0.12)", color: "#2dd4bf" },
  completed: { bg: "rgba(100,116,139,0.12)", color: "#94a3b8" },
  canceled: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
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

export default async function OperatorDashboardPage() {
  const aderoUser = await requireAderoRole(["operator", "admin"]);

  const [trips, availabilityRow, pendingOffers] = await Promise.all([
    db
      .select()
      .from(aderoTrips)
      .where(eq(aderoTrips.operatorId, aderoUser.id))
      .orderBy(desc(aderoTrips.createdAt)),
    db
      .select()
      .from(aderoOperatorAvailability)
      .where(eq(aderoOperatorAvailability.userId, aderoUser.id))
      .limit(1),
    db
      .select({
        id: aderoRequestOffers.id,
        requestId: aderoRequestOffers.requestId,
        status: aderoRequestOffers.status,
        offeredAt: aderoRequestOffers.offeredAt,
        pickupAddress: aderoRequests.pickupAddress,
        dropoffAddress: aderoRequests.dropoffAddress,
        pickupAt: aderoRequests.pickupAt,
        requestStatus: aderoRequests.status,
        serviceType: aderoRequests.serviceType,
        passengerCount: aderoRequests.passengerCount,
      })
      .from(aderoRequestOffers)
      .innerJoin(aderoRequests, eq(aderoRequestOffers.requestId, aderoRequests.id))
      .where(
        and(
          eq(aderoRequestOffers.operatorId, aderoUser.id),
          eq(aderoRequestOffers.status, "pending"),
        ),
      )
      .orderBy(desc(aderoRequestOffers.offeredAt)),
  ]);

  const availability = availabilityRow[0];
  const availabilityStatus =
    (availability?.availabilityStatus as AderoOperatorAvailabilityStatus | undefined) ??
    "offline";
  const availabilityLabel =
    ADERO_OPERATOR_AVAILABILITY_STATUS_LABELS[availabilityStatus] ?? "Offline";

  const activeTrips = trips.filter(
    (trip) => trip.status !== "completed" && trip.status !== "canceled",
  );
  const completedTrips = trips.filter((trip) => trip.status === "completed");

  return (
    <div className="space-y-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            Welcome back{aderoUser.firstName ? `, ${aderoUser.firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Manage availability, respond to incoming offers, and run active trips.
          </p>
        </div>
        <Link
          href="/app/operator/payments"
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "rgba(99,102,241,0.18)", color: "#c7d2fe" }}
        >
          Payments & Earnings
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6366f1" }}>
            Availability
          </p>
          <p className="text-2xl font-light" style={{ color: "#f1f5f9" }}>
            {availabilityLabel}
          </p>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6366f1" }}>
            Pending Offers
          </p>
          <p className="text-2xl font-light" style={{ color: "#f1f5f9" }}>
            {pendingOffers.length}
          </p>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6366f1" }}>
            Active Trips
          </p>
          <p className="text-2xl font-light" style={{ color: "#f1f5f9" }}>
            {activeTrips.length}
          </p>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6366f1" }}>
            Completed Jobs
          </p>
          <p className="text-2xl font-light" style={{ color: "#f1f5f9" }}>
            {completedTrips.length}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <AvailabilityToggle
          currentStatus={availabilityStatus}
          currentServiceArea={availability?.serviceArea ?? ""}
        />

        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
              Incoming Offers
            </p>
            <p className="text-[11px]" style={{ color: "#64748b" }}>
              Pending: {pendingOffers.length}
            </p>
          </div>

          {pendingOffers.length === 0 ? (
            <p className="mt-4 text-xs" style={{ color: "#64748b" }}>
              No pending dispatch offers right now.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {pendingOffers.map((offer) => {
                const requestStatus =
                  (offer.requestStatus as AderoRequestStatus) ?? "submitted";
                const requestStatusLabel =
                  ADERO_REQUEST_STATUS_LABELS[requestStatus] ?? offer.requestStatus;
                const requestStatusStyle =
                  REQUEST_STATUS_STYLES[requestStatus] ?? REQUEST_STATUS_STYLES.submitted;
                const serviceTypeLabel =
                  ADERO_SERVICE_TYPE_LABELS[offer.serviceType as AderoServiceType] ??
                  offer.serviceType;

                return (
                  <div
                    key={offer.id}
                    className="rounded-lg border p-4"
                    style={{
                      borderColor: "rgba(255,255,255,0.08)",
                      background: "rgba(15,23,42,0.55)",
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                            style={requestStatusStyle}
                          >
                            {requestStatusLabel}
                          </span>
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                            style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                          >
                            {serviceTypeLabel}
                          </span>
                        </div>
                        <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
                          {offer.pickupAddress}
                          <span style={{ color: "#475569" }}> → </span>
                          {offer.dropoffAddress}
                        </p>
                        <p className="text-xs" style={{ color: "#64748b" }}>
                          Pickup: {fmtDatetime(offer.pickupAt)} · {offer.passengerCount}{" "}
                          {offer.passengerCount === 1 ? "passenger" : "passengers"}
                        </p>
                        <p className="text-xs" style={{ color: "#475569" }}>
                          Offered: {fmtDatetime(offer.offeredAt)}
                        </p>
                      </div>

                      <Link
                        href={`/app/operator/offers/${offer.id}`}
                        className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium"
                        style={{ background: "rgba(99,102,241,0.16)", color: "#a5b4fc" }}
                      >
                        View →
                      </Link>
                    </div>

                    <div className="mt-3">
                      <OfferResponseControls offerId={offer.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {activeTrips.length === 0 ? (
        <div
          className="rounded-xl border px-5 py-12 text-center"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "#64748b" }}>
            No active trips assigned.
          </p>
          <p className="mt-1 text-xs" style={{ color: "#334155" }}>
            Accept an offer to create and start a trip.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[3px]" style={{ color: "#475569" }}>
            Active Trips
          </h2>
          <div className="space-y-2">
            {activeTrips.map((trip) => {
              const status = trip.status as AderoTripStatus;
              const statusStyle = TRIP_STATUS_STYLES[status] ?? TRIP_STATUS_STYLES.assigned;
              const statusLabel = ADERO_TRIP_STATUS_LABELS[status] ?? trip.status;

              return (
                <div
                  key={trip.id}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: "rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={statusStyle}
                      >
                        {statusLabel}
                      </span>
                      <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
                        {trip.pickupAddress}
                        <span style={{ color: "#475569" }}> → </span>
                        {trip.dropoffAddress}
                      </p>
                      <p className="text-xs" style={{ color: "#475569" }}>
                        Scheduled: {fmtDatetime(trip.scheduledAt)}
                      </p>
                    </div>
                    <Link
                      href={`/app/operator/trips/${trip.id}`}
                      className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium"
                      style={{ background: "rgba(99,102,241,0.16)", color: "#a5b4fc" }}
                    >
                      Open →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
