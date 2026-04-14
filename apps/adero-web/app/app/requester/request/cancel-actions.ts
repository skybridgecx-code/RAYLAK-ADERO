"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  aderoRequestOffers,
  aderoRequests,
  aderoTrips,
  db,
} from "@raylak/db";
import { z } from "zod";
import { requireAderoRole } from "@/lib/auth";
import {
  calculateCancelPenalty,
  recordCancelPenalty,
} from "@/lib/cancel-policy";
import { createNotification } from "@/lib/notifications";

const CancelRequestSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().trim().max(2000).optional(),
});

export type CancelRequestActionState = {
  error: string | null;
  success: string | null;
};

function formatMoney(value: number, currency: string): string {
  return `${currency.toUpperCase()} $${value.toFixed(2)}`;
}

export async function cancelRequest(
  _prev: CancelRequestActionState,
  formData: FormData,
): Promise<CancelRequestActionState> {
  let actor;
  try {
    actor = await requireAderoRole(["requester", "company", "admin"]);
  } catch {
    return { error: "You must be signed in.", success: null };
  }

  const parsed = CancelRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    reason: (formData.get("reason") as string) || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid cancellation request.", success: null };
  }

  const now = new Date();

  try {
    const [request, trip] = await Promise.all([
      db
        .select({
          id: aderoRequests.id,
          requesterId: aderoRequests.requesterId,
          status: aderoRequests.status,
        })
        .from(aderoRequests)
        .where(eq(aderoRequests.id, parsed.data.requestId))
        .limit(1),
      db
        .select({ id: aderoTrips.id })
        .from(aderoTrips)
        .where(eq(aderoTrips.requestId, parsed.data.requestId))
        .orderBy(desc(aderoTrips.createdAt))
        .limit(1),
    ]);

    const requestRow = request[0];
    const tripRow = trip[0];

    if (!requestRow) {
      return { error: "Request not found.", success: null };
    }

    if (requestRow.requesterId !== actor.id) {
      return { error: "You can only cancel your own requests.", success: null };
    }

    if (!["submitted", "matched"].includes(requestRow.status)) {
      return {
        error: "This request can no longer be canceled.",
        success: null,
      };
    }

    const penalty = await calculateCancelPenalty(
      requestRow.id,
      tripRow?.id ?? null,
      actor.id,
      "requester",
    );

    const pendingOffers = await db
      .select({
        id: aderoRequestOffers.id,
        operatorId: aderoRequestOffers.operatorId,
      })
      .from(aderoRequestOffers)
      .where(
        and(
          eq(aderoRequestOffers.requestId, requestRow.id),
          eq(aderoRequestOffers.status, "pending"),
        ),
      );

    const [updatedRequest] = await db
      .update(aderoRequests)
      .set({
        status: "canceled",
        updatedAt: now,
      })
      .where(
        and(
          eq(aderoRequests.id, requestRow.id),
          inArray(aderoRequests.status, ["submitted", "matched"]),
        ),
      )
      .returning({ id: aderoRequests.id });

    if (!updatedRequest) {
      return {
        error: "Request could not be canceled because status changed.",
        success: null,
      };
    }

    await db
      .update(aderoRequestOffers)
      .set({
        status: "expired",
        respondedAt: now,
      })
      .where(
        and(
          eq(aderoRequestOffers.requestId, requestRow.id),
          eq(aderoRequestOffers.status, "pending"),
        ),
      );

    await recordCancelPenalty({
      tripId: tripRow?.id,
      requestId: requestRow.id,
      userId: actor.id,
      cancelledByRole: "requester",
      reason: parsed.data.reason,
      penaltyType: penalty.penaltyType,
      penaltyAmount: penalty.penaltyAmount,
    });

    await createNotification(
      actor.id,
      "trip_status_changed",
      "Request canceled",
      penalty.penaltyAmount > 0
        ? `Your request has been canceled. Cancellation fee: ${formatMoney(
            penalty.penaltyAmount,
            penalty.currency,
          )}.`
        : "Your request has been canceled with no cancellation fee.",
      {
        requestId: requestRow.id,
        penaltyType: penalty.penaltyType,
        penaltyAmount: penalty.penaltyAmount,
      },
    );

    const notifyOperators = pendingOffers.map((offer) =>
      createNotification(
        offer.operatorId,
        "offer_declined",
        "Request canceled",
        `A pending request you were offered was canceled by the requester.`,
        {
          requestId: requestRow.id,
          offerId: offer.id,
        },
      ),
    );
    await Promise.allSettled(notifyOperators);

    revalidatePath("/app/requester");
    revalidatePath("/app/operator");
    revalidatePath("/app/requester/request/new");

    return {
      error: null,
      success:
        penalty.penaltyAmount > 0
          ? `Request canceled. Fee applied: ${formatMoney(
              penalty.penaltyAmount,
              penalty.currency,
            )}.`
          : "Request canceled successfully.",
    };
  } catch (error) {
    console.error("[adero/requester] cancel request failed:", error);
    return { error: "Failed to cancel request.", success: null };
  }
}
