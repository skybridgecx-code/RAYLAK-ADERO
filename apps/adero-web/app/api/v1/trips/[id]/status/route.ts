import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { aderoRequests, aderoTripStatusLog, aderoTrips, db } from "@raylak/db";
import type { AderoTripStatus } from "@raylak/db/schema";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { createInvoiceForTrip } from "@/lib/invoicing";
import { createNotification, notifyTripStatusChanged } from "@/lib/notifications";
import {
  isAderoTripStatus,
  validateTripTransition,
} from "@/lib/trip-lifecycle";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

const BodySchema = z.object({
  status: z.enum([
    "operator_en_route",
    "operator_arrived",
    "in_progress",
    "completed",
  ]),
  note: z.string().trim().max(500).optional(),
});

function formatUsd(value: string | number): string {
  const parsed = Number(value);
  if (Number.isFinite(parsed) === false) {
    return "$0.00";
  }
  return `$${parsed.toFixed(2)}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const routeParams = await params;
    const parsedParams = ParamsSchema.safeParse(routeParams);
    if (parsedParams.success === false) {
      return apiError("Invalid trip id.", 400);
    }

    const { user } = await authenticateRequest();
    if (user.role !== "operator" && user.role !== "admin") {
      return apiError("Forbidden", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const parsedBody = BodySchema.safeParse(body);
    if (parsedBody.success === false) {
      return apiError("Invalid trip status payload.", 400);
    }

    const tripId = parsedParams.data.id;
    const [trip] = await db
      .select({
        id: aderoTrips.id,
        status: aderoTrips.status,
        operatorId: aderoTrips.operatorId,
        requesterId: aderoRequests.requesterId,
        startedAt: aderoTrips.startedAt,
      })
      .from(aderoTrips)
      .innerJoin(aderoRequests, eq(aderoTrips.requestId, aderoRequests.id))
      .where(eq(aderoTrips.id, tripId))
      .limit(1);

    if (trip === undefined) {
      return apiError("Trip not found.", 404);
    }

    if (user.role !== "admin" && trip.operatorId !== user.id) {
      return apiError("Forbidden", 403);
    }

    if (isAderoTripStatus(trip.status) === false) {
      return apiError(`Unknown trip status: ${trip.status}`, 400);
    }

    const targetStatus: AderoTripStatus = parsedBody.data.status;
    validateTripTransition(trip.status, targetStatus);

    const now = new Date();
    const updateValues: Partial<typeof aderoTrips.$inferInsert> = {
      status: targetStatus,
      updatedAt: now,
    };

    if (targetStatus === "in_progress" && trip.startedAt === null) {
      updateValues.startedAt = now;
    }

    if (targetStatus === "completed") {
      updateValues.completedAt = now;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(aderoTrips)
        .set(updateValues)
        .where(eq(aderoTrips.id, trip.id));

      await tx.insert(aderoTripStatusLog).values({
        tripId: trip.id,
        fromStatus: trip.status,
        toStatus: targetStatus,
        changedBy: user.id,
        note: parsedBody.data.note?.trim() || null,
        createdAt: now,
      });
    });

    try {
      await notifyTripStatusChanged(trip.requesterId, trip.id, targetStatus);
    } catch (error) {
      console.error("[adero/api/v1/trips/status] requester notification failed:", error);
    }

    if (targetStatus === "completed") {
      try {
        const invoice = await createInvoiceForTrip(trip.id);
        await Promise.all([
          createNotification(
            trip.requesterId,
            "trip_completed",
            `Invoice issued — ${formatUsd(invoice.totalAmount)} for trip #${trip.id.slice(0, 8)}`,
            `Invoice ${invoice.invoiceNumber} is now available for your completed trip.`,
            {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              tripId: trip.id,
            },
          ),
          createNotification(
            trip.operatorId,
            "trip_completed",
            `Trip completed — invoice #${invoice.invoiceNumber} issued`,
            `Invoice ${invoice.invoiceNumber} has been generated for this completed trip.`,
            {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              tripId: trip.id,
            },
          ),
        ]);
      } catch (error) {
        console.error("[adero/api/v1/trips/status] invoice generation failed:", error);
      }
    }

    return apiSuccess({
      tripId: trip.id,
      status: targetStatus,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    const message = getErrorMessage(error, "Failed to update trip status.");
    if (
      message.includes("Illegal trip status transition")
      || message.includes("Trip is already in status")
      || message.includes("Unknown current trip status")
      || message.includes("Unknown new trip status")
    ) {
      return apiError(message, 400);
    }
    return apiError(message, 500);
  }
}
