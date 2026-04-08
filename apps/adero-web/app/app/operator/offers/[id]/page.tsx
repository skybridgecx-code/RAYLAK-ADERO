import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import {
  db,
  aderoRequestOffers,
  aderoRequests,
  aderoTrips,
} from "@raylak/db";
import {
  ADERO_REQUEST_OFFER_STATUS_LABELS,
  ADERO_REQUEST_STATUS_LABELS,
  ADERO_SERVICE_TYPE_LABELS,
  ADERO_TRIP_STATUS_LABELS,
  type AderoRequestOfferStatus,
  type AderoRequestStatus,
  type AderoServiceType,
  type AderoTripStatus,
} from "@raylak/db/schema";
import { requireAderoRole } from "@/lib/auth";
import { OfferResponseControls } from "../../offer-response-controls";

export const metadata: Metadata = {
  title: "Operator Offer - Adero",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const OFFER_STATUS_STYLES: Record<AderoRequestOfferStatus, { bg: string; color: string }> = {
  pending: { bg: "rgba(250,204,21,0.12)", color: "#fde047" },
  accepted: { bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  declined: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
  expired: { bg: "rgba(100,116,139,0.12)", color: "#94a3b8" },
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

export default async function OperatorOfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireAderoRole(["operator", "admin"]).catch(() =>
    notFound(),
  );

  const [offer] = await db
    .select({
      id: aderoRequestOffers.id,
      requestId: aderoRequestOffers.requestId,
      operatorId: aderoRequestOffers.operatorId,
      offerStatus: aderoRequestOffers.status,
      offeredAt: aderoRequestOffers.offeredAt,
      respondedAt: aderoRequestOffers.respondedAt,
      createdAt: aderoRequestOffers.createdAt,
      requestStatus: aderoRequests.status,
      serviceType: aderoRequests.serviceType,
      pickupAddress: aderoRequests.pickupAddress,
      dropoffAddress: aderoRequests.dropoffAddress,
      pickupAt: aderoRequests.pickupAt,
      passengerCount: aderoRequests.passengerCount,
      vehiclePreference: aderoRequests.vehiclePreference,
      notes: aderoRequests.notes,
    })
    .from(aderoRequestOffers)
    .innerJoin(aderoRequests, eq(aderoRequestOffers.requestId, aderoRequests.id))
    .where(eq(aderoRequestOffers.id, id))
    .limit(1);

  if (!offer) {
    notFound();
  }

  if (actor.role !== "admin" && offer.operatorId !== actor.id) {
    notFound();
  }

  const [trip] = await db
    .select({
      id: aderoTrips.id,
      status: aderoTrips.status,
    })
    .from(aderoTrips)
    .where(
      and(
        eq(aderoTrips.requestId, offer.requestId),
        eq(aderoTrips.operatorId, offer.operatorId),
      ),
    )
    .limit(1);

  const offerStatus = offer.offerStatus as AderoRequestOfferStatus;
  const offerStatusLabel =
    ADERO_REQUEST_OFFER_STATUS_LABELS[offerStatus] ?? offer.offerStatus;
  const offerStatusStyle = OFFER_STATUS_STYLES[offerStatus] ?? OFFER_STATUS_STYLES.pending;
  const requestStatusLabel =
    ADERO_REQUEST_STATUS_LABELS[offer.requestStatus as AderoRequestStatus] ??
    offer.requestStatus;
  const serviceTypeLabel =
    ADERO_SERVICE_TYPE_LABELS[offer.serviceType as AderoServiceType] ??
    offer.serviceType;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/app/operator"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: "#475569" }}
          >
            ← Back to operator dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            Offer #{offer.id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Review dispatch request details and respond.
          </p>
        </div>

        <span
          className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide"
          style={offerStatusStyle}
        >
          {offerStatusLabel}
        </span>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Request Details
        </p>
        <div className="mt-3 space-y-2 text-sm" style={{ color: "#cbd5e1" }}>
          <p>
            <span style={{ color: "#64748b" }}>Route:</span> {offer.pickupAddress}
            <span style={{ color: "#475569" }}> → </span>
            {offer.dropoffAddress}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Pickup:</span> {fmtDatetime(offer.pickupAt)}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Passengers:</span> {offer.passengerCount}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Service type:</span> {serviceTypeLabel}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Request status:</span> {requestStatusLabel}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Offered:</span> {fmtDatetime(offer.offeredAt)}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Responded:</span> {fmtDatetime(offer.respondedAt)}
          </p>
          <p>
            <span style={{ color: "#64748b" }}>Created:</span> {fmtDatetime(offer.createdAt)}
          </p>
          {offer.vehiclePreference && (
            <p>
              <span style={{ color: "#64748b" }}>Vehicle preference:</span>{" "}
              {offer.vehiclePreference}
            </p>
          )}
          {offer.notes && (
            <p>
              <span style={{ color: "#64748b" }}>Notes:</span> {offer.notes}
            </p>
          )}
        </div>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Actions
        </p>
        {offerStatus === "pending" ? (
          <div className="mt-3">
            <OfferResponseControls offerId={offer.id} />
          </div>
        ) : (
          <p className="mt-3 text-xs" style={{ color: "#64748b" }}>
            This offer is already {offerStatusLabel.toLowerCase()}.
          </p>
        )}

        {trip && (
          <div className="mt-4 rounded-lg border p-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Created trip:{" "}
              <span style={{ color: "#e2e8f0" }}>
                {trip.id.slice(0, 8)} ·{" "}
                {ADERO_TRIP_STATUS_LABELS[trip.status as AderoTripStatus] ?? trip.status}
              </span>
            </p>
            <Link
              href={`/app/operator/trips/${trip.id}`}
              className="mt-2 inline-block text-xs font-medium"
              style={{ color: "#a5b4fc" }}
            >
              Open trip →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
