import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { aderoRequestOffers, aderoRequests, db } from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

export async function GET(_request: NextRequest) {
  try {
    const { user } = await authenticateRequest();

    if (user.role !== "operator" && user.role !== "admin") {
      return apiError("Forbidden", 403);
    }

    const offers =
      user.role === "admin"
        ? await db
            .select({
              offer: aderoRequestOffers,
              request: aderoRequests,
            })
            .from(aderoRequestOffers)
            .innerJoin(aderoRequests, eq(aderoRequestOffers.requestId, aderoRequests.id))
            .orderBy(desc(aderoRequestOffers.createdAt))
        : await db
            .select({
              offer: aderoRequestOffers,
              request: aderoRequests,
            })
            .from(aderoRequestOffers)
            .innerJoin(aderoRequests, eq(aderoRequestOffers.requestId, aderoRequests.id))
            .where(eq(aderoRequestOffers.operatorId, user.id))
            .orderBy(desc(aderoRequestOffers.createdAt));

    return apiSuccess(offers);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load offers."), 500);
  }
}
