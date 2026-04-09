"use server";

import { revalidatePath } from "next/cache";
import { requireAderoUser } from "@/lib/auth";
import { addDisputeMessage, createDispute } from "@/lib/disputes";
import { createDisputeMessageSchema, createDisputeSchema } from "@/lib/validators";

export type DisputeActionState = {
  error: string | null;
  success: string | null;
};

export async function fileDispute(
  _prev: DisputeActionState,
  formData: FormData,
): Promise<DisputeActionState> {
  let actor;
  try {
    actor = await requireAderoUser();
  } catch {
    return { error: "You must be signed in.", success: null };
  }

  const raw = {
    tripId: formData.get("tripId") as string,
    filedAgainstUserId: (formData.get("filedAgainstUserId") as string) || undefined,
    category: formData.get("category") as string,
    priority: (formData.get("priority") as string) || undefined,
    subject: formData.get("subject") as string,
    description: formData.get("description") as string,
  };

  const parsed = createDisputeSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid dispute data.";
    return { error: firstError, success: null };
  }

  try {
    await createDispute(actor.id, parsed.data);
    revalidatePath("/app/disputes");
    revalidatePath(`/app/requester/trips/${parsed.data.tripId}`);
    revalidatePath(`/app/operator/trips/${parsed.data.tripId}`);
    return { error: null, success: "Dispute filed successfully." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to file dispute.";
    return { error: message, success: null };
  }
}

export async function sendDisputeMessage(
  _prev: DisputeActionState,
  formData: FormData,
): Promise<DisputeActionState> {
  let actor;
  try {
    actor = await requireAderoUser();
  } catch {
    return { error: "You must be signed in.", success: null };
  }

  const raw = {
    disputeId: formData.get("disputeId") as string,
    message: formData.get("message") as string,
    attachmentUrl: (formData.get("attachmentUrl") as string) || undefined,
  };

  const parsed = createDisputeMessageSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid message data.";
    return { error: firstError, success: null };
  }

  try {
    await addDisputeMessage(actor.id, actor.role, parsed.data);
    revalidatePath("/app/disputes");
    revalidatePath(`/app/disputes/${parsed.data.disputeId}`);
    return { error: null, success: "Message sent." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message.";
    return { error: message, success: null };
  }
}
