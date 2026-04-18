import type { AderoRequestStatus, AderoTripStatus } from "@raylak/db/schema";

type QueueRequestStatus = Extract<AderoRequestStatus, "submitted" | "matched">;
type ActiveTripStatus = Exclude<AderoTripStatus, "completed" | "canceled">;

export const ACTIVE_TRIP_STATUSES: ActiveTripStatus[] = [
  "assigned",
  "operator_en_route",
  "operator_arrived",
  "in_progress",
];

export function isQueueRequestStatus(value: string): value is QueueRequestStatus {
  return value === "submitted" || value === "matched";
}

export function getQueueStatusForPendingOffers(
  currentStatus: string,
  pendingOfferCount: number,
): QueueRequestStatus | null {
  if (!isQueueRequestStatus(currentStatus)) {
    return null;
  }

  return pendingOfferCount > 0 ? "matched" : "submitted";
}

export function isActiveTripStatus(value: string): value is ActiveTripStatus {
  return (ACTIVE_TRIP_STATUSES as readonly string[]).includes(value);
}

export function getRequestStatusForTripStatus(
  tripStatus: AderoTripStatus,
): AderoRequestStatus {
  switch (tripStatus) {
    case "assigned":
    case "operator_en_route":
    case "operator_arrived":
      return "accepted";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "canceled":
      return "canceled";
    default: {
      const exhaustiveCheck: never = tripStatus;
      return exhaustiveCheck;
    }
  }
}
