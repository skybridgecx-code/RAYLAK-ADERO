"use server";

import { redirect } from "next/navigation";
import { db, aderoCompanyApplications } from "@raylak/db";
import { CompanyApplicationSchema, type ApplicationActionState } from "~/lib/validators";

export async function submitCompanyApplication(
  _prevState: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const raw = {
    companyName: formData.get("companyName"),
    website: formData.get("website"),
    contactFirstName: formData.get("contactFirstName"),
    contactLastName: formData.get("contactLastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    fleetSize: formData.get("fleetSize"),
    serviceMarkets: formData.get("serviceMarkets"),
    overflowNeeds: formData.get("overflowNeeds"),
  };

  const result = CompanyApplicationSchema.safeParse(raw);

  if (!result.success) {
    return {
      error: "Please correct the errors below.",
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = result.data;

  try {
    await db.insert(aderoCompanyApplications).values({
      companyName: data.companyName,
      website: data.website || null,
      contactFirstName: data.contactFirstName,
      contactLastName: data.contactLastName,
      email: data.email.toLowerCase().trim(),
      phone: data.phone || null,
      fleetSize: data.fleetSize ? Number(data.fleetSize) : null,
      serviceMarkets: data.serviceMarkets,
      overflowNeeds: data.overflowNeeds || null,
    });
  } catch (err) {
    console.error("[adero] Company application insert failed:", err);
    return {
      error: "Something went wrong. Please try again or email us at network@adero.io.",
      fieldErrors: {},
    };
  }

  redirect("/apply/company/success");
}
