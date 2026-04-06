"use server";

import { aderoCompanyProfiles, aderoOperatorProfiles, db } from "@raylak/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { PROFILE_STATUSES, VEHICLE_TYPES } from "~/lib/validators";
import { z } from "zod";

export type ProfileActionState = {
  error: string | null;
  fieldErrors: Record<string, string[] | undefined>;
  saved: boolean;
};

const CompanyProfileInput = z.object({
  id: z.string().uuid(),
  companyName: z.string().trim().min(2, "Company name is required"),
  serviceArea: z.string().trim().min(2, "Service area is required"),
  contactName: z.string().trim().min(2, "Contact name is required"),
  email: z.string().trim().email("Valid email address required"),
  phone: z.string().trim().optional(),
  website: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  fleetSize: z.coerce
    .number()
    .int()
    .min(1, "Fleet size must be at least 1")
    .optional()
    .or(z.literal("")),
  serviceNotes: z.string().trim().optional(),
  activationStatus: z.enum(PROFILE_STATUSES),
});

const OperatorProfileInput = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(2, "Full name is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().optional(),
  email: z.string().trim().email("Valid email address required"),
  phone: z.string().trim().optional(),
  vehicleType: z.enum(VEHICLE_TYPES, { message: "Please select a vehicle type" }),
  vehicleYear: z.coerce
    .number()
    .int()
    .min(1990, "Vehicle year is too old")
    .max(new Date().getFullYear() + 1, "Vehicle year is too far in the future")
    .optional()
    .or(z.literal("")),
  yearsExperience: z.coerce
    .number()
    .int()
    .min(0, "Years of experience cannot be negative")
    .max(50, "Years of experience is too high")
    .optional()
    .or(z.literal("")),
  serviceNotes: z.string().trim().optional(),
  activationStatus: z.enum(PROFILE_STATUSES),
});

function emptyToNull(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

function optionalNumberToNull(value: number | "" | undefined) {
  return typeof value === "number" ? value : null;
}

export async function updateCompanyProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const result = CompanyProfileInput.safeParse({
    id: formData.get("id"),
    companyName: formData.get("companyName"),
    serviceArea: formData.get("serviceArea"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? undefined,
    website: formData.get("website") ?? "",
    fleetSize: formData.get("fleetSize") ?? "",
    serviceNotes: formData.get("serviceNotes") ?? undefined,
    activationStatus: formData.get("activationStatus"),
  });

  if (!result.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: result.error.flatten().fieldErrors,
      saved: false,
    };
  }

  const data = result.data;
  const now = new Date();

  try {
    await db
      .update(aderoCompanyProfiles)
      .set({
        companyName: data.companyName,
        serviceArea: data.serviceArea,
        contactName: data.contactName,
        email: data.email,
        phone: emptyToNull(data.phone),
        website: emptyToNull(data.website),
        fleetSize: optionalNumberToNull(data.fleetSize),
        serviceNotes: emptyToNull(data.serviceNotes),
        activationStatus: data.activationStatus,
        updatedAt: now,
      })
      .where(eq(aderoCompanyProfiles.id, data.id));
  } catch (err) {
    console.error("[adero] updateCompanyProfile failed:", err);
    return { error: "Profile update failed. Please try again.", fieldErrors: {}, saved: false };
  }

  revalidatePath("/admin/profiles");
  revalidatePath("/admin/profiles/companies");
  revalidatePath(`/admin/profiles/companies/${data.id}`);
  revalidatePath(`/admin/profiles/companies/${data.id}/edit`);
  return { error: null, fieldErrors: {}, saved: true };
}

export async function updateOperatorProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const result = OperatorProfileInput.safeParse({
    id: formData.get("id"),
    fullName: formData.get("fullName"),
    city: formData.get("city"),
    state: formData.get("state") ?? undefined,
    email: formData.get("email"),
    phone: formData.get("phone") ?? undefined,
    vehicleType: formData.get("vehicleType"),
    vehicleYear: formData.get("vehicleYear") ?? "",
    yearsExperience: formData.get("yearsExperience") ?? "",
    serviceNotes: formData.get("serviceNotes") ?? undefined,
    activationStatus: formData.get("activationStatus"),
  });

  if (!result.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: result.error.flatten().fieldErrors,
      saved: false,
    };
  }

  const data = result.data;
  const now = new Date();

  try {
    await db
      .update(aderoOperatorProfiles)
      .set({
        fullName: data.fullName,
        city: data.city,
        state: emptyToNull(data.state),
        email: data.email,
        phone: emptyToNull(data.phone),
        vehicleType: data.vehicleType,
        vehicleYear: optionalNumberToNull(data.vehicleYear),
        yearsExperience: optionalNumberToNull(data.yearsExperience),
        serviceNotes: emptyToNull(data.serviceNotes),
        activationStatus: data.activationStatus,
        updatedAt: now,
      })
      .where(eq(aderoOperatorProfiles.id, data.id));
  } catch (err) {
    console.error("[adero] updateOperatorProfile failed:", err);
    return { error: "Profile update failed. Please try again.", fieldErrors: {}, saved: false };
  }

  revalidatePath("/admin/profiles");
  revalidatePath("/admin/profiles/operators");
  revalidatePath(`/admin/profiles/operators/${data.id}`);
  revalidatePath(`/admin/profiles/operators/${data.id}/edit`);
  return { error: null, fieldErrors: {}, saved: true };
}
