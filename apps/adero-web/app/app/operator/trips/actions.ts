"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, aderoTripStatusLog, aderoTrips } from "@raylak/db";
import type { AderoTripStatus, AderoUser } from "@raylak/db/schema";
import { requireAderoRole } from "@/lib/auth";
import {
  isAderoTripStatus,
  validateTripTransition,
} from "@/lib/trip-lifecycle";

export type TripLifecycleActionState = {
  error: string | null;
  success: string | null;
};

const AdvanceTripStatusSchema = z.object({
  tripId: z.string().uuid(),
  toStatus: z.enum([
    "operator_en_route",
    "operator_arrived",
    "in_progress",
    "completed",
  ]),
  note: z.string().trim().max(500).optional(),
});

const CancelTripSchema = z.object({
  tripId: z.string().uuid(),
  reason: z.string().trim().min(3, "Cancel reason is required").max(500),
});

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Trip update failed. Please try again.";
}

function revalidateTripViews(tripId: string) {
  revalidatePath("/app/operator");
  revalidatePath(`/app/operator/trips/${tripId}`);
  revalidatePath("/app/requester");
  revalidatePath(`/app/requester/trips/${tripId}`);
}

async function getAuthorizedTrip(
  tripId: string,
  actor: { id: string; role: string },
): Promise<{
  id: string;
  status: AderoTripStatus;
  operatorId: string;
  startedAt: Date | null;
}> {
  const [trip] = await db
    .select({
      id: aderoTrips.id,
      status: aderoTrips.status,
      operatorId: aderoTrips.operatorId,
      startedAt: aderoTrips.startedAt,
    })
    .from(aderoTrips)
    .where(eq(aderoTrips.id, tripId))
    .limit(1);

  if (!trip) {
    throw new Error("Trip not found.");
  }

  if (actor.role !== "admin" && trip.operatorId !== actor.id) {
    throw new Error("Forbidden: this trip is not assigned to you.");
  }

  if (!isAderoTripStatus(trip.status)) {
    throw new Error(`Unknown trip status: ${trip.status}`);
  }

  return {
    id: trip.id,
    status: trip.status,
    operatorId: trip.operatorId,
    startedAt: trip.startedAt,
  };
}

export async function advanceTripStatus(
  _prev: TripLifecycleActionState,
  formData: FormData,
): Promise<TripLifecycleActionState> {
  let actor: AderoUser;
  try {
    actor = await requireAderoRole(["operator", "admin"]);
  } catch {
    return { error: "You must be signed in as an operator.", success: null };
  }

  const parsed = AdvanceTripStatusSchema.safeParse({
    tripId: formData.get("tripId"),
    toStatus: formData.get("toStatus"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.flatten().fieldErrors.toStatus?.[0] ??
        parsed.error.flatten().fieldErrors.tripId?.[0] ??
        "Invalid trip update payload.",
      success: null,
    };
  }

  const { tripId, toStatus, note } = parsed.data;

  try {
    const trip = await getAuthorizedTrip(tripId, actor);
    validateTripTransition(trip.status, toStatus);

    const now = new Date();
    const updateValues: Partial<typeof aderoTrips.$inferInsert> = {
      status: toStatus,
      updatedAt: now,
    };

    if (toStatus === "in_progress" && !trip.startedAt) {
      updateValues.startedAt = now;
    }

    if (toStatus === "completed") {
      updateValues.completedAt = now;
    }

    await db.transaction(async (tx) => {
      await tx.update(aderoTrips).set(updateValues).where(eq(aderoTrips.id, trip.id));

      await tx.insert(aderoTripStatusLog).values({
        tripId: trip.id,
        fromStatus: trip.status,
        toStatus,
        changedBy: actor.id,
        note: note?.trim() || null,
        createdAt: now,
      });
    });

    revalidateTripViews(trip.id);

    return { error: null, success: "Trip status updated." };
  } catch (error) {
    console.error("[adero] advanceTripStatus failed:", error);
    return { error: getErrorMessage(error), success: null };
  }
}

export async function cancelTrip(
  _prev: TripLifecycleActionState,
  formData: FormData,
): Promise<TripLifecycleActionState> {
  let actor: AderoUser;
  try {
    actor = await requireAderoRole(["operator", "admin"]);
  } catch {
    return { error: "You must be signed in as an operator.", success: null };
  }

  const parsed = CancelTripSchema.safeParse({
    tripId: formData.get("tripId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.flatten().fieldErrors.reason?.[0] ??
        parsed.error.flatten().fieldErrors.tripId?.[0] ??
        "Invalid cancellation payload.",
      success: null,
    };
  }

  const { tripId, reason } = parsed.data;

  try {
    const trip = await getAuthorizedTrip(tripId, actor);
    validateTripTransition(trip.status, "canceled");

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(aderoTrips)
        .set({
          status: "canceled",
          canceledAt: now,
          cancelReason: reason,
          updatedAt: now,
        })
        .where(eq(aderoTrips.id, trip.id));

      await tx.insert(aderoTripStatusLog).values({
        tripId: trip.id,
        fromStatus: trip.status,
        toStatus: "canceled",
        changedBy: actor.id,
        note: reason,
        createdAt: now,
      });
    });

    revalidateTripViews(trip.id);

    return { error: null, success: "Trip canceled." };
  } catch (error) {
    console.error("[adero] cancelTrip failed:", error);
    return { error: getErrorMessage(error), success: null };
  }
}
