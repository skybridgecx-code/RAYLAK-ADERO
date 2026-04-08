"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  db,
  aderoOperatorAvailability,
  aderoRequestOffers,
  aderoRequests,
  aderoTripStatusLog,
  aderoTrips,
} from "@raylak/db";
import type { AderoUser } from "@raylak/db/schema";
import {
  ADERO_OPERATOR_AVAILABILITY_STATUSES,
  ADERO_REQUEST_OFFER_STATUSES,
} from "@raylak/db/schema";
import { requireAderoRole } from "@/lib/auth";

export type OperatorWorkflowActionState = {
  error: string | null;
  success: string | null;
  tripId: string | null;
};

const SetAvailabilitySchema = z.object({
  availabilityStatus: z.enum(ADERO_OPERATOR_AVAILABILITY_STATUSES),
  serviceArea: z.string().trim().max(255).optional(),
});

const OfferActionSchema = z.object({
  offerId: z.string().uuid(),
});

function actionError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Action failed. Please try again.";
}

function revalidateOperatorViews(offerId?: string, tripId?: string) {
  revalidatePath("/app/operator");
  if (offerId) {
    revalidatePath(`/app/operator/offers/${offerId}`);
  }
  if (tripId) {
    revalidatePath(`/app/operator/trips/${tripId}`);
  }
  revalidatePath("/app/requester");
}

async function requireOperatorActor(): Promise<AderoUser> {
  return requireAderoRole(["operator", "admin"]);
}

export async function setAvailability(
  _prev: OperatorWorkflowActionState,
  formData: FormData,
): Promise<OperatorWorkflowActionState> {
  let actor: AderoUser;
  try {
    actor = await requireOperatorActor();
  } catch {
    return { error: "You must be signed in as an operator.", success: null, tripId: null };
  }

  const parsed = SetAvailabilitySchema.safeParse({
    availabilityStatus: formData.get("availabilityStatus"),
    serviceArea: formData.get("serviceArea") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid availability update.", success: null, tripId: null };
  }

  const now = new Date();
  const serviceArea = parsed.data.serviceArea?.trim() || null;

  try {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: aderoOperatorAvailability.id })
        .from(aderoOperatorAvailability)
        .where(eq(aderoOperatorAvailability.userId, actor.id))
        .limit(1);

      if (existing) {
        await tx
          .update(aderoOperatorAvailability)
          .set({
            availabilityStatus: parsed.data.availabilityStatus,
            serviceArea,
            updatedAt: now,
          })
          .where(eq(aderoOperatorAvailability.id, existing.id));
      } else {
        await tx.insert(aderoOperatorAvailability).values({
          userId: actor.id,
          availabilityStatus: parsed.data.availabilityStatus,
          serviceArea,
          updatedAt: now,
        });
      }
    });
  } catch (error) {
    console.error("[adero] setAvailability failed:", error);
    return { error: actionError(error), success: null, tripId: null };
  }

  revalidateOperatorViews();
  return { error: null, success: "Availability updated.", tripId: null };
}

export async function acceptOffer(
  _prev: OperatorWorkflowActionState,
  formData: FormData,
): Promise<OperatorWorkflowActionState> {
  let actor: AderoUser;
  try {
    actor = await requireOperatorActor();
  } catch {
    return { error: "You must be signed in as an operator.", success: null, tripId: null };
  }

  const parsed = OfferActionSchema.safeParse({
    offerId: formData.get("offerId"),
  });

  if (!parsed.success) {
    return { error: "Invalid offer action.", success: null, tripId: null };
  }

  const { offerId } = parsed.data;
  const now = new Date();
  let tripId: string | null = null;

  try {
    await db.transaction(async (tx) => {
      const [offer] = await tx
        .select({
          id: aderoRequestOffers.id,
          requestId: aderoRequestOffers.requestId,
          operatorId: aderoRequestOffers.operatorId,
          offerStatus: aderoRequestOffers.status,
          requestStatus: aderoRequests.status,
          pickupAddress: aderoRequests.pickupAddress,
          dropoffAddress: aderoRequests.dropoffAddress,
          pickupAt: aderoRequests.pickupAt,
        })
        .from(aderoRequestOffers)
        .innerJoin(aderoRequests, eq(aderoRequestOffers.requestId, aderoRequests.id))
        .where(eq(aderoRequestOffers.id, offerId))
        .limit(1);

      if (!offer) {
        throw new Error("Offer not found.");
      }

      if (actor.role !== "admin" && offer.operatorId !== actor.id) {
        throw new Error("Forbidden: this offer is not assigned to you.");
      }

      if (offer.offerStatus !== "pending") {
        throw new Error(`Offer is already ${offer.offerStatus}.`);
      }

      const [existingTrip] = await tx
        .select({ id: aderoTrips.id })
        .from(aderoTrips)
        .where(eq(aderoTrips.requestId, offer.requestId))
        .limit(1);

      if (existingTrip) {
        throw new Error("A trip already exists for this request.");
      }

      const [acceptedOffer] = await tx
        .update(aderoRequestOffers)
        .set({
          status: "accepted",
          respondedAt: now,
        })
        .where(
          and(
            eq(aderoRequestOffers.id, offer.id),
            eq(aderoRequestOffers.status, "pending"),
          ),
        )
        .returning({ id: aderoRequestOffers.id });

      if (!acceptedOffer) {
        throw new Error("Offer is no longer pending.");
      }

      const [updatedRequest] = await tx
        .update(aderoRequests)
        .set({
          status: "accepted",
          updatedAt: now,
        })
        .where(
          and(
            eq(aderoRequests.id, offer.requestId),
            inArray(aderoRequests.status, ["submitted", "matched"]),
          ),
        )
        .returning({ id: aderoRequests.id });

      if (!updatedRequest) {
        throw new Error("Request is no longer available for acceptance.");
      }

      await tx
        .update(aderoRequestOffers)
        .set({
          status: "expired",
          respondedAt: now,
        })
        .where(
          and(
            eq(aderoRequestOffers.requestId, offer.requestId),
            eq(aderoRequestOffers.status, "pending"),
            ne(aderoRequestOffers.id, offer.id),
          ),
        );

      const [trip] = await tx
        .insert(aderoTrips)
        .values({
          requestId: offer.requestId,
          operatorId: offer.operatorId,
          status: "assigned",
          pickupAddress: offer.pickupAddress,
          dropoffAddress: offer.dropoffAddress,
          scheduledAt: offer.pickupAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: aderoTrips.id });

      if (!trip) {
        throw new Error("Trip could not be created.");
      }

      tripId = trip.id;

      await tx.insert(aderoTripStatusLog).values({
        tripId: trip.id,
        fromStatus: "assigned",
        toStatus: "assigned",
        changedBy: actor.id,
        note: "Trip created from accepted offer.",
        createdAt: now,
      });
    });
  } catch (error) {
    console.error("[adero] acceptOffer failed:", error);
    return { error: actionError(error), success: null, tripId: null };
  }

  revalidateOperatorViews(offerId, tripId ?? undefined);
  return { error: null, success: "Offer accepted and trip created.", tripId };
}

export async function declineOffer(
  _prev: OperatorWorkflowActionState,
  formData: FormData,
): Promise<OperatorWorkflowActionState> {
  let actor: AderoUser;
  try {
    actor = await requireOperatorActor();
  } catch {
    return { error: "You must be signed in as an operator.", success: null, tripId: null };
  }

  const parsed = OfferActionSchema.safeParse({
    offerId: formData.get("offerId"),
  });

  if (!parsed.success) {
    return { error: "Invalid offer action.", success: null, tripId: null };
  }

  const { offerId } = parsed.data;
  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      const [offer] = await tx
        .select({
          id: aderoRequestOffers.id,
          operatorId: aderoRequestOffers.operatorId,
          status: aderoRequestOffers.status,
        })
        .from(aderoRequestOffers)
        .where(eq(aderoRequestOffers.id, offerId))
        .limit(1);

      if (!offer) {
        throw new Error("Offer not found.");
      }

      if (actor.role !== "admin" && offer.operatorId !== actor.id) {
        throw new Error("Forbidden: this offer is not assigned to you.");
      }

      if (offer.status !== "pending") {
        if ((ADERO_REQUEST_OFFER_STATUSES as readonly string[]).includes(offer.status)) {
          throw new Error(`Offer is already ${offer.status}.`);
        }
        throw new Error("Offer is no longer pending.");
      }

      const [updated] = await tx
        .update(aderoRequestOffers)
        .set({
          status: "declined",
          respondedAt: now,
        })
        .where(
          and(
            eq(aderoRequestOffers.id, offer.id),
            eq(aderoRequestOffers.status, "pending"),
          ),
        )
        .returning({ id: aderoRequestOffers.id });

      if (!updated) {
        throw new Error("Offer is no longer pending.");
      }
    });
  } catch (error) {
    console.error("[adero] declineOffer failed:", error);
    return { error: actionError(error), success: null, tripId: null };
  }

  revalidateOperatorViews(offerId);
  return { error: null, success: "Offer declined.", tripId: null };
}
