import "server-only";

import { and, count, eq, lt } from "drizzle-orm";
import { aderoRequestOffers, aderoRequests, aderoTrips, db } from "@raylak/db";
import { createNotification } from "@/lib/notifications";
import { getQueueStatusForPendingOffers } from "./request-status-sync";

export const OFFER_EXPIRY_HOURS = 24;

export async function checkAndExpireOffers(): Promise<{
  expiredCount: number;
  offerIds: string[];
}> {
  const threshold = new Date(Date.now() - OFFER_EXPIRY_HOURS * 60 * 60 * 1000);

  const pendingOffers = await db
    .select({
      id: aderoRequestOffers.id,
      operatorId: aderoRequestOffers.operatorId,
      requestId: aderoRequestOffers.requestId,
      requestStatus: aderoRequests.status,
    })
    .from(aderoRequestOffers)
    .innerJoin(aderoRequests, eq(aderoRequestOffers.requestId, aderoRequests.id))
    .where(
      and(
        eq(aderoRequestOffers.status, "pending"),
        lt(aderoRequestOffers.createdAt, threshold),
      ),
    );

  const expiredIds: string[] = [];

  for (const offer of pendingOffers) {
    try {
      const [updated] = await db
        .update(aderoRequestOffers)
        .set({
          status: "expired",
          respondedAt: new Date(),
        })
        .where(
          and(
            eq(aderoRequestOffers.id, offer.id),
            eq(aderoRequestOffers.status, "pending"),
          ),
        )
        .returning({ id: aderoRequestOffers.id });

      if (!updated) {
        continue;
      }

      const [pendingCounts] = await db
        .select({ pendingCount: count() })
        .from(aderoRequestOffers)
        .where(
          and(
            eq(aderoRequestOffers.requestId, offer.requestId),
            eq(aderoRequestOffers.status, "pending"),
          ),
        );

      const [tripCounts] = await db
        .select({ tripCount: count() })
        .from(aderoTrips)
        .where(eq(aderoTrips.requestId, offer.requestId));

      const nextRequestStatus = getQueueStatusForPendingOffers(
        offer.requestStatus,
        pendingCounts?.pendingCount ?? 0,
        tripCounts?.tripCount ?? 0,
      );

      if (nextRequestStatus && nextRequestStatus !== offer.requestStatus) {
        await db
          .update(aderoRequests)
          .set({
            status: nextRequestStatus,
            updatedAt: new Date(),
          })
          .where(eq(aderoRequests.id, offer.requestId));
      }

      await createNotification(
        offer.operatorId,
        "offer_declined",
        "Offer expired",
        `A dispatch offer for request #${offer.requestId.slice(0, 8)} has expired.`,
        {
          offerId: offer.id,
          requestId: offer.requestId,
        },
      );

      expiredIds.push(offer.id);
    } catch (error) {
      console.error("[adero/offer-expiry] failed to expire offer", {
        offerId: offer.id,
        error,
      });
    }
  }

  return {
    expiredCount: expiredIds.length,
    offerIds: expiredIds,
  };
}
