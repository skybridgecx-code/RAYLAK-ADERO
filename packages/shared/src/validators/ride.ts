import { z } from "zod";
import { DRIVER_AVAILABILITY_STATUSES } from "../enums";

/**
 * Status values a driver is permitted to transition a booking to.
 * Drivers cannot cancel, re-quote, or jump to dispatcher-only statuses.
 */
export const DRIVER_ALLOWED_TO_STATUSES = [
  "driver_en_route",
  "driver_arrived",
  "passenger_picked_up",
  "completed",
  "no_show",
] as const;

export type DriverAllowedToStatus = (typeof DRIVER_ALLOWED_TO_STATUSES)[number];

export const AdvanceRideStatusSchema = z.object({
  bookingId: z.string().uuid(),
  toStatus: z.enum(DRIVER_ALLOWED_TO_STATUSES),
});

export type AdvanceRideStatusInput = z.infer<typeof AdvanceRideStatusSchema>;

export const SetDriverAvailabilitySchema = z.object({
  status: z.enum(DRIVER_AVAILABILITY_STATUSES),
});

export type SetDriverAvailabilityInput = z.infer<typeof SetDriverAvailabilitySchema>;
