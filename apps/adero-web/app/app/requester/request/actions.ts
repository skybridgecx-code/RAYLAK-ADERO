"use server";

import { aderoRequests, db } from "@raylak/db";
import { requireAderoRole } from "@/lib/auth";
import { dispatchRequest } from "@/lib/dispatch";
import { createQuoteForRequest } from "@/lib/pricing";
import { RequestCreationSchema } from "@/lib/validators";

export type RequestActionState = {
  error: string | null;
  fieldErrors: Record<string, string[] | undefined>;
  savedId: string | null;
  dispatchedOffers: number | null;
};

export async function createRequest(
  _prev: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  let aderoUser;
  try {
    aderoUser = await requireAderoRole(["requester", "company", "admin"]);
  } catch {
    return {
      error: "You must be signed in to create a request.",
      fieldErrors: {},
      savedId: null,
      dispatchedOffers: null,
    };
  }

  const result = RequestCreationSchema.safeParse({
    serviceType: formData.get("serviceType"),
    pickupAddress: formData.get("pickupAddress"),
    dropoffAddress: formData.get("dropoffAddress"),
    pickupAt: formData.get("pickupAt"),
    passengerCount: formData.get("passengerCount"),
    vehiclePreference: formData.get("vehiclePreference") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });

  if (!result.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: result.error.flatten().fieldErrors,
      savedId: null,
      dispatchedOffers: null,
    };
  }

  const data = result.data;
  const now = new Date();

  try {
    const [request] = await db
      .insert(aderoRequests)
      .values({
        requesterId: aderoUser.id,
        serviceType: data.serviceType,
        pickupAddress: data.pickupAddress,
        dropoffAddress: data.dropoffAddress,
        pickupAt: new Date(data.pickupAt),
        passengerCount: data.passengerCount,
        vehiclePreference: data.vehiclePreference?.trim() || null,
        notes: data.notes?.trim() || null,
        status: "submitted",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: aderoRequests.id });

    if (!request) throw new Error("Insert returned no row.");

    try {
      await createQuoteForRequest(request.id, { sendImmediately: true });
    } catch (quoteErr) {
      console.error("[adero] createQuoteForRequest failed:", quoteErr);
    }

    let dispatchedOffers = 0;
    try {
      dispatchedOffers = await dispatchRequest(request.id);
    } catch (dispatchErr) {
      console.error("[adero] dispatchRequest failed:", dispatchErr);
    }

    return { error: null, fieldErrors: {}, savedId: request.id, dispatchedOffers };
  } catch (err) {
    console.error("[adero] createRequest failed:", err);
    return {
      error: "Request could not be saved. Please try again.",
      fieldErrors: {},
      savedId: null,
      dispatchedOffers: null,
    };
  }
}
