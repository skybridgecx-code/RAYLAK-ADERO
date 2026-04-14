import "server-only";

import { and, eq, lt } from "drizzle-orm";
import { aderoRequestOffers, db } from "@raylak/db";
import { createNotification } from "@/lib/notifications";

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
    })
    .from(aderoRequestOffers)
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
