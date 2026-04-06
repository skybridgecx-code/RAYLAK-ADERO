import { z } from "zod";
import { VEHICLE_TYPES } from "../enums";

const CURRENT_YEAR = new Date().getFullYear();

export const VehicleSchema = z.object({
  make: z.string().min(1, "Make is required").max(100),
  model: z.string().min(1, "Model is required").max(100),
  year: z.coerce
    .number()
    .int()
    .min(1990, "Year must be 1990 or later")
    .max(CURRENT_YEAR + 2, "Year is too far in the future"),
  type: z.enum(VEHICLE_TYPES, { message: "Select a vehicle type" }),
  licensePlate: z.string().min(1, "License plate is required").max(20),
  vin: z.string().max(20).optional(),
  color: z.string().max(50).optional(),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(100),
  luggageCapacity: z.coerce.number().int().min(0).max(50).optional(),
  amenities: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  notes: z.string().max(2000).optional(),
});

export type VehicleInput = z.infer<typeof VehicleSchema>;
