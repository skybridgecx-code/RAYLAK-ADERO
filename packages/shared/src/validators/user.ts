import { z } from "zod";
import { USER_ROLES } from "../enums";

export const UpsertUserSchema = z.object({
  clerkId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(USER_ROLES).default("customer"),
});

export type UpsertUserInput = z.infer<typeof UpsertUserSchema>;

export const UpdateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(USER_ROLES),
});

export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;
