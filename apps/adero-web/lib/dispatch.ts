import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  aderoOperatorAvailability,
  aderoRequestOffers,
  aderoRequests,
  aderoUsers,
} from "@raylak/db";

function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function serviceAreaMatchesRequest(
  serviceArea: string | null,
  pickupAddress: string,
  dropoffAddress: string,
): boolean {
  const area = normalize(serviceArea);
  if (!area) return true;

  const requestArea = normalize(`${pickupAddress} ${dropoffAddress}`);
  if (!requestArea) return true;

  const areaCandidates = area
    .split(/[,/|;]+/)
    .map((part) => normalize(part))
    .filter(Boolean);

  if (areaCandidates.length === 0) return true;

  return areaCandidates.some((candidate) => requestArea.includes(candidate));
}

/**
 * Dispatches a submitted/matched request to eligible available operators.
 *
 * Returns how many new offers were created.
 */
export async function dispatchRequest(requestId: string): Promise<number> {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [request] = await tx
      .select({
        id: aderoRequests.id,
        status: aderoRequests.status,
        pickupAddress: aderoRequests.pickupAddress,
        dropoffAddress: aderoRequests.dropoffAddress,
      })
      .from(aderoRequests)
      .where(eq(aderoRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error("Request not found.");
    }

    if (request.status !== "submitted" && request.status !== "matched") {
      return 0;
    }

    const availableOperators = await tx
      .select({
        operatorId: aderoOperatorAvailability.userId,
        serviceArea: aderoOperatorAvailability.serviceArea,
      })
      .from(aderoOperatorAvailability)
      .innerJoin(aderoUsers, eq(aderoOperatorAvailability.userId, aderoUsers.id))
      .where(
        and(
          eq(aderoOperatorAvailability.availabilityStatus, "available"),
          eq(aderoUsers.role, "operator"),
        ),
      );

    if (availableOperators.length === 0) {
      return 0;
    }

    const availableOperatorIds = availableOperators.map((operator) => operator.operatorId);

    const existingOffers = await tx
      .select({
        operatorId: aderoRequestOffers.operatorId,
      })
      .from(aderoRequestOffers)
      .where(
        and(
          eq(aderoRequestOffers.requestId, request.id),
          inArray(aderoRequestOffers.operatorId, availableOperatorIds),
        ),
      );

    const existingOperatorIds = new Set(existingOffers.map((offer) => offer.operatorId));

    const eligibleOperators = availableOperators.filter((operator) => {
      if (existingOperatorIds.has(operator.operatorId)) {
        return false;
      }

      return serviceAreaMatchesRequest(
        operator.serviceArea,
        request.pickupAddress,
        request.dropoffAddress,
      );
    });

    if (eligibleOperators.length === 0) {
      return 0;
    }

    await tx.insert(aderoRequestOffers).values(
      eligibleOperators.map((operator) => ({
        requestId: request.id,
        operatorId: operator.operatorId,
        status: "pending",
        offeredAt: now,
        createdAt: now,
      })),
    );

    if (request.status === "submitted") {
      await tx
        .update(aderoRequests)
        .set({
          status: "matched",
          updatedAt: now,
        })
        .where(
          and(
            eq(aderoRequests.id, request.id),
            eq(aderoRequests.status, "submitted"),
          ),
        );
    }

    return eligibleOperators.length;
  });
}
