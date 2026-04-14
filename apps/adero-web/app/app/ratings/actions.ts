"use server";

import { revalidatePath } from "next/cache";
import { requireAderoUser } from "@/lib/auth";
import { createRating } from "@/lib/ratings";
import { createRatingSchema } from "@/lib/validators";

export type RatingActionState = {
  error: string | null;
  success: string | null;
};

export async function submitRating(
  _prev: RatingActionState,
  formData: FormData,
): Promise<RatingActionState> {
  let actor;
  try {
    actor = await requireAderoUser();
  } catch {
    return { error: "You must be signed in.", success: null };
  }

  const raw = {
    tripId: formData.get("tripId") as string,
    rateeUserId: formData.get("rateeUserId") as string,
    raterRole: formData.get("raterRole") as string,
    overallScore: Number(formData.get("overallScore")),
    punctualityScore: formData.get("punctualityScore")
      ? Number(formData.get("punctualityScore"))
      : undefined,
    professionalismScore: formData.get("professionalismScore")
      ? Number(formData.get("professionalismScore"))
      : undefined,
    vehicleConditionScore: formData.get("vehicleConditionScore")
      ? Number(formData.get("vehicleConditionScore"))
      : undefined,
    communicationScore: formData.get("communicationScore")
      ? Number(formData.get("communicationScore"))
      : undefined,
    comment: (formData.get("comment") as string) || undefined,
  };

  const parsed = createRatingSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid rating data.";
    return { error: firstError, success: null };
  }

  try {
    await createRating(actor.id, parsed.data);
    revalidatePath(`/app/requester/trips/${parsed.data.tripId}`);
    revalidatePath(`/app/operator/trips/${parsed.data.tripId}`);
    return { error: null, success: "Rating submitted. Thank you!" };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to submit rating.";
    return { error: message, success: null };
  }
}
