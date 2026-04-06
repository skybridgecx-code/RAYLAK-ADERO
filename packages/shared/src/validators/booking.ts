import { z } from "zod";
import { BOOKING_STATUSES, SERVICE_TYPES } from "../enums";

export const CreateBookingSchema = z.object({
  serviceType: z.enum(SERVICE_TYPES),
  customerId: z.string().min(1),
  scheduledAt: z.coerce.date(),
  pickupAddress: z.string().min(1, "Pickup address is required"),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffAddress: z.string().min(1, "Dropoff address is required"),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  stops: z
    .array(
      z.object({
        sequence: z.number().int().positive(),
        address: z.string().min(1),
        lat: z.number().optional(),
        lng: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
  passengerCount: z.number().int().min(1).max(100),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  specialInstructions: z.string().max(1000).optional(),
  flightNumber: z.string().max(20).optional(),
  isPrivate: z.boolean().default(false),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export const UpdateBookingStatusSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum(BOOKING_STATUSES),
  note: z.string().max(500).optional(),
});

export type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusSchema>;

export const BookingFilterSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type BookingFilterInput = z.infer<typeof BookingFilterSchema>;
