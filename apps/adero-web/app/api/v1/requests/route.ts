import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import {
  aderoRequestOffers,
  aderoRequests,
  db,
} from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { dispatchRequest } from "@/lib/dispatch";
import { createQuoteForRequest } from "@/lib/pricing";
import { RequestCreationSchema } from "@/lib/validators";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

export async function GET(_request: NextRequest) {
  try {
    const { user } = await authenticateRequest();

    if (user.role === "requester" || user.role === "company") {
      const requests = await db
        .select()
        .from(aderoRequests)
        .where(eq(aderoRequests.requesterId, user.id))
        .orderBy(desc(aderoRequests.createdAt));
      return apiSuccess(requests);
    }

    if (user.role === "operator") {
      const offers = await db
        .select({
          offerId: aderoRequestOffers.id,
          offerStatus: aderoRequestOffers.status,
          offeredAt: aderoRequestOffers.offeredAt,
          respondedAt: aderoRequestOffers.respondedAt,
          request: aderoRequests,
        })
        .from(aderoRequestOffers)
        .innerJoin(aderoRequests, eq(aderoRequestOffers.requestId, aderoRequests.id))
        .where(eq(aderoRequestOffers.operatorId, user.id))
        .orderBy(desc(aderoRequestOffers.createdAt));
      return apiSuccess(offers);
    }

    const allRequests = await db
      .select()
      .from(aderoRequests)
      .orderBy(desc(aderoRequests.createdAt));

    return apiSuccess(allRequests);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load requests."), 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest();

    if (user.role !== "requester" && user.role !== "company" && user.role !== "admin") {
      return apiError("Forbidden", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const parsed = RequestCreationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid request payload.", 400);
    }

    const now = new Date();
    const [created] = await db
      .insert(aderoRequests)
      .values({
        requesterId: user.id,
        serviceType: parsed.data.serviceType,
        pickupAddress: parsed.data.pickupAddress,
        dropoffAddress: parsed.data.dropoffAddress,
        pickupAt: new Date(parsed.data.pickupAt),
        passengerCount: parsed.data.passengerCount,
        vehiclePreference: parsed.data.vehiclePreference?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        status: "submitted",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) {
      return apiError("Failed to create request.", 500);
    }

    let quoteCreated = false;
    try {
      await createQuoteForRequest(created.id, { sendImmediately: true });
      quoteCreated = true;
    } catch (error) {
      console.error("[adero/api/v1/requests] quote creation failed:", error);
    }

    let dispatchedOffers = 0;
    try {
      dispatchedOffers = await dispatchRequest(created.id);
    } catch (error) {
      console.error("[adero/api/v1/requests] dispatch failed:", error);
    }

    return apiSuccess(
      {
        request: created,
        quoteCreated,
        dispatchedOffers,
      },
      201,
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to create request."), 500);
  }
}
