"use server";

import { redirect } from "next/navigation";
import { db, aderoOperatorApplications } from "@raylak/db";
import { OperatorApplicationSchema, type ApplicationActionState } from "~/lib/validators";

export async function submitOperatorApplication(
  _prevState: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    state: formData.get("state"),
    vehicleType: formData.get("vehicleType"),
    vehicleYear: formData.get("vehicleYear"),
    yearsExperience: formData.get("yearsExperience"),
    currentAffiliations: formData.get("currentAffiliations"),
    bio: formData.get("bio"),
  };

  const result = OperatorApplicationSchema.safeParse(raw);

  if (!result.success) {
    return {
      error: "Please correct the errors below.",
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = result.data;

  try {
    await db.insert(aderoOperatorApplications).values({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase().trim(),
      phone: data.phone || null,
      city: data.city,
      state: data.state || null,
      vehicleType: data.vehicleType,
      vehicleYear: data.vehicleYear ? Number(data.vehicleYear) : null,
      yearsExperience: data.yearsExperience ? Number(data.yearsExperience) : null,
      currentAffiliations: data.currentAffiliations || null,
      bio: data.bio || null,
    });
  } catch (err) {
    console.error("[adero] Operator application insert failed:", err);
    return {
      error: "Something went wrong. Please try again or email us at operators@adero.io.",
      fieldErrors: {},
    };
  }

  redirect("/apply/operator/success");
}
