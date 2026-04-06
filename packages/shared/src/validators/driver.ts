import { z } from "zod";

export const DriverSchema = z.object({
  // User identity fields
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Valid email required"),
  phone: z.string().max(20).optional(),

  // License
  licenseNumber: z.string().max(50).optional(),
  licenseState: z.string().max(50).optional(),
  licenseExpiry: z.coerce.date().optional(),

  // Profile
  defaultVehicleId: z.string().uuid().optional(),
  isVerified: z.boolean().default(false),
  isActive: z.boolean().default(true),
  bio: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

export type DriverInput = z.infer<typeof DriverSchema>;
