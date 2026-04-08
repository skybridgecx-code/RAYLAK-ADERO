import {
  ADERO_TRIP_STATUSES,
  ADERO_TRIP_STATUS_TRANSITIONS,
  type AderoTripStatus,
} from "@raylak/db/schema";

export function isAderoTripStatus(value: string): value is AderoTripStatus {
  return (ADERO_TRIP_STATUSES as readonly string[]).includes(value);
}

export function getValidTripTransitions(status: AderoTripStatus): AderoTripStatus[] {
  return ADERO_TRIP_STATUS_TRANSITIONS[status] ?? [];
}

export function validateTripTransition(
  currentStatus: AderoTripStatus,
  newStatus: AderoTripStatus,
): void {
  if (!isAderoTripStatus(currentStatus)) {
    throw new Error(`Unknown current trip status: ${currentStatus}`);
  }

  if (!isAderoTripStatus(newStatus)) {
    throw new Error(`Unknown new trip status: ${newStatus}`);
  }

  if (currentStatus === newStatus) {
    throw new Error(`Trip is already in status: ${newStatus}`);
  }

  const allowed = getValidTripTransitions(currentStatus);
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Illegal trip status transition: ${currentStatus} -> ${newStatus}`,
    );
  }
}
