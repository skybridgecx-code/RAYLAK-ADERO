/**
 * Operational event emitter for the RAYLAK platform.
 *
 * Publishes typed events to Redis so the realtime server can fan them out to
 * connected Socket.io clients (dispatchers, drivers).
 *
 * All functions are fire-and-forget: errors are swallowed and logged.
 * Never await these in the critical path of a tRPC mutation.
 */
import "server-only";
import { getRedis } from "./redis";
import {
  REDIS_CHANNEL_OPS,
  type BookingStatusChangedEvent,
  type BookingAssignedEvent,
  type DriverAvailabilityChangedEvent,
  type DriverLocationUpdatedEvent,
  type RaylakEvent,
} from "@raylak/shared/events";

function publish(event: RaylakEvent): void {
  getRedis().publish(REDIS_CHANNEL_OPS, JSON.stringify(event)).catch((err: unknown) => {
    console.error("[events] Failed to publish:", (err as Error).message ?? err);
  });
}

// ─── Booking events ───────────────────────────────────────────────────────────

export function emitBookingStatusChanged(
  params: Omit<BookingStatusChangedEvent, "type" | "ts">,
): void {
  publish({ type: "booking.status_changed", ...params, ts: Date.now() });
}

export function emitBookingAssigned(
  params: Omit<BookingAssignedEvent, "type" | "ts">,
): void {
  publish({ type: "booking.assigned", ...params, ts: Date.now() });
}

// ─── Driver events ────────────────────────────────────────────────────────────

export function emitDriverAvailabilityChanged(
  params: Omit<DriverAvailabilityChangedEvent, "type" | "ts">,
): void {
  publish({ type: "driver.availability_changed", ...params, ts: Date.now() });
}

export function emitDriverLocationUpdated(
  params: Omit<DriverLocationUpdatedEvent, "type" | "ts">,
): void {
  publish({ type: "driver.location_updated", ...params, ts: Date.now() });
}
