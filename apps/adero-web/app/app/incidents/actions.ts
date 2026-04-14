"use server";

import { revalidatePath } from "next/cache";
import { requireAderoUser } from "@/lib/auth";
import { createIncident } from "@/lib/incidents";
import { createIncidentSchema } from "@/lib/validators";

export type IncidentActionState = {
  error: string | null;
  success: string | null;
};

export async function reportIncident(
  _prev: IncidentActionState,
  formData: FormData,
): Promise<IncidentActionState> {
  let actor;
  try {
    actor = await requireAderoUser();
  } catch {
    return { error: "You must be signed in.", success: null };
  }

  const latitudeRaw = formData.get("latitude");
  const longitudeRaw = formData.get("longitude");

  const raw = {
    tripId: (formData.get("tripId") as string) || undefined,
    severity: formData.get("severity") as string,
    category: formData.get("category") as string,
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    location: (formData.get("location") as string) || undefined,
    latitude:
      typeof latitudeRaw === "string" && latitudeRaw.length > 0
        ? Number(latitudeRaw)
        : undefined,
    longitude:
      typeof longitudeRaw === "string" && longitudeRaw.length > 0
        ? Number(longitudeRaw)
        : undefined,
  };

  const parsed = createIncidentSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid incident data.";
    return { error: firstError, success: null };
  }

  try {
    await createIncident(actor.id, parsed.data);
    revalidatePath("/app/incidents");
    if (parsed.data.tripId) {
      revalidatePath(`/app/requester/trips/${parsed.data.tripId}`);
      revalidatePath(`/app/operator/trips/${parsed.data.tripId}`);
    }
    return { error: null, success: "Incident reported successfully." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to report incident.";
    return { error: message, success: null };
  }
}
