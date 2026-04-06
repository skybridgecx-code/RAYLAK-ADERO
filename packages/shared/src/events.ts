/**
 * Typed event catalog for RAYLAK real-time backbone.
 *
 * These types are the single source of truth for:
 *   - Redis pub/sub message payloads (publisher: apps/web, subscriber: server/)
 *   - Socket.io event payloads (emitter: server/, receiver: browser clients)
 *
 * Every event must include a `ts` Unix millisecond timestamp set by the publisher.
 * Event types use dot-namespaced strings for easy routing: "<domain>.<action>".
 */

// ─── Booking events ───────────────────────────────────────────────────────────

export interface BookingStatusChangedEvent {
  type: "booking.status_changed";
  bookingId: string;
  referenceCode: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string | null;
  ts: number;
}

export interface BookingAssignedEvent {
  type: "booking.assigned";
  bookingId: string;
  referenceCode: string;
  driverProfileId: string;
  vehicleId: string;
  actorId: string | null;
  ts: number;
}

// ─── Driver events ────────────────────────────────────────────────────────────

export interface DriverLocationUpdatedEvent {
  type: "driver.location_updated";
  driverProfileId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null; // km/h
  ts: number;
}

export interface DriverAvailabilityChangedEvent {
  type: "driver.availability_changed";
  driverProfileId: string;
  status: string;
  ts: number;
}

// ─── Union type ───────────────────────────────────────────────────────────────

export type RaylakEvent =
  | BookingStatusChangedEvent
  | BookingAssignedEvent
  | DriverLocationUpdatedEvent
  | DriverAvailabilityChangedEvent;

// ─── Redis channels ───────────────────────────────────────────────────────────

/** All operational events land here — consumed by the realtime server */
export const REDIS_CHANNEL_OPS = "raylak:ops" as const;

/** Driver-specific events — keyed by driverProfileId */
export const redisChannelDriver = (driverProfileId: string) =>
  `raylak:driver:${driverProfileId}` as const;

// ─── Socket.io typed event maps ───────────────────────────────────────────────

/**
 * Events the server sends to clients.
 * Mirrors event type strings so clients can use `socket.on(event.type, handler)`.
 */
export interface ServerToClientEvents {
  "booking.status_changed": (event: BookingStatusChangedEvent) => void;
  "booking.assigned": (event: BookingAssignedEvent) => void;
  "driver.location_updated": (event: DriverLocationUpdatedEvent) => void;
  "driver.availability_changed": (event: DriverAvailabilityChangedEvent) => void;
}

/** Clients do not emit structured events in this phase */
export type ClientToServerEvents = Record<never, never>;

export interface InterServerEvents {
  _placeholder: () => void;
}

export interface SocketData {
  userId: string;
  role: string;
  driverProfileId?: string;
}
