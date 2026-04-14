"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, aderoUsers } from "@raylak/db";
import { addDisputeMessage, updateDisputeStatus } from "@/lib/disputes";
import { createDisputeMessageSchema, updateDisputeStatusSchema } from "@/lib/validators";

export type AdminDisputeActionState = {
  error: string | null;
  success: string | null;
};

async function assertAdminAccess(): Promise<void> {
  const secret = process.env["ADERO_ADMIN_SECRET"];
  const cookieStore = await cookies();
  const session = cookieStore.get("adero_admin")?.value;

  if (!secret || session !== secret) {
    throw new Error("Admin access required.");
  }
}

async function getAdminActorId(): Promise<string> {
  const [admin] = await db
    .select({ id: aderoUsers.id })
    .from(aderoUsers)
    .where(eq(aderoUsers.role, "admin"))
    .limit(1);

  if (!admin) {
    throw new Error("No admin user found.");
  }

  return admin.id;
}

export async function adminUpdateDisputeStatus(
  _prev: AdminDisputeActionState,
  formData: FormData,
): Promise<AdminDisputeActionState> {
  try {
    await assertAdminAccess();
  } catch {
    return { error: "Admin access required.", success: null };
  }

  const parsed = updateDisputeStatusSchema.safeParse({
    disputeId: formData.get("disputeId"),
    status: formData.get("status"),
    resolution: (formData.get("resolution") as string) || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid dispute status payload.", success: null };
  }

  try {
    const actorId = await getAdminActorId();
    await updateDisputeStatus(parsed.data.disputeId, actorId, parsed.data);
    revalidatePath("/admin/quality/disputes");
    revalidatePath(`/admin/quality/disputes/${parsed.data.disputeId}`);
    revalidatePath("/app/disputes");
    return { error: null, success: "Dispute status updated." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update dispute.";
    return { error: message, success: null };
  }
}

export async function adminSendDisputeMessage(
  _prev: AdminDisputeActionState,
  formData: FormData,
): Promise<AdminDisputeActionState> {
  try {
    await assertAdminAccess();
  } catch {
    return { error: "Admin access required.", success: null };
  }

  const parsed = createDisputeMessageSchema.safeParse({
    disputeId: formData.get("disputeId"),
    message: formData.get("message"),
    attachmentUrl: (formData.get("attachmentUrl") as string) || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid dispute message payload.", success: null };
  }

  try {
    await addDisputeMessage(null, "admin", parsed.data);
    revalidatePath(`/admin/quality/disputes/${parsed.data.disputeId}`);
    revalidatePath("/app/disputes");
    return { error: null, success: "Message sent." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message.";
    return { error: message, success: null };
  }
}
