/**
 * Core enums for the RAYLAK platform.
 *
 * These are the source of truth — database columns reference these values
 * directly (as Drizzle pgEnum) and all application code imports from here.
 */

// ─── User Roles ──────────────────────────────────────────────────────────────

export const USER_ROLES = [
  "owner", // RAYLAK company owner
  "admin", // Company-level operator administrator
  "dispatcher", // Dispatch operations
  "driver", // Driver (PWA user)
  "customer", // End customer (booking portal)
] as const;

export type UserRole = (typeof USER_ROLES)[number];

// ─── Booking Status ──────────────────────────────────────────────────────────

/**
 * Enforced state machine. Transitions are validated server-side.
 *
 * Flow:
 *   new_request → quoted → confirmed → assigned
 *   → driver_en_route → driver_arrived → passenger_picked_up → completed
 *
 * Terminal states: completed | canceled | no_show
 */
export const BOOKING_STATUSES = [
  "new_request",
  "quoted",
  "confirmed",
  "assigned",
  "driver_en_route",
  "driver_arrived",
  "passenger_picked_up",
  "completed",
  "canceled",
  "no_show",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * Valid forward transitions for each status.
 * Used server-side to reject illegal transitions.
 */
export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  new_request: ["quoted", "canceled"],
  quoted: ["confirmed", "canceled"],
  confirmed: ["assigned", "canceled"],
  assigned: ["driver_en_route", "canceled"],
  driver_en_route: ["driver_arrived", "canceled"],
  driver_arrived: ["passenger_picked_up", "no_show"],
  passenger_picked_up: ["completed"],
  completed: [],
  canceled: [],
  no_show: [],
};

// ─── Vehicle Types ────────────────────────────────────────────────────────────

export const VEHICLE_TYPES = ["sedan", "suv", "van", "sprinter", "limousine", "bus"] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

// ─── Service Types ────────────────────────────────────────────────────────────

export const SERVICE_TYPES = [
  "airport_transfer",
  "point_to_point",
  "hourly_charter",
  "event",
  "corporate",
  "long_distance",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

// ─── Notification Channels ────────────────────────────────────────────────────

export const NOTIFICATION_CHANNELS = ["email", "sms", "push", "in_app"] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
