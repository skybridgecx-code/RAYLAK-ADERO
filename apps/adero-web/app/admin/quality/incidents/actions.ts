"use server";

import { requireAderoAdminCookie } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, aderoUsers } from "@raylak/db";
import { updateIncidentStatus } from "@/lib/incidents";
import { updateIncidentStatusSchema } from "@/lib/validators";

export type AdminIncidentActionState = {
  error: string | null;
  success: string | null;
};

async function assertAdminAccess(): Promise<void> {
  await requireAderoAdminCookie();
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

export async function adminUpdateIncidentStatus(
  _prev: AdminIncidentActionState,
  formData: FormData,
): Promise<AdminIncidentActionState> {
  try {
    await assertAdminAccess();
  } catch {
    return { error: "Admin access required.", success: null };
  }

  const parsed = updateIncidentStatusSchema.safeParse({
    incidentId: formData.get("incidentId"),
    status: formData.get("status"),
    adminNotes: (formData.get("adminNotes") as string) || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid incident status payload.", success: null };
  }

  try {
    const actorId = await getAdminActorId();
    await updateIncidentStatus(parsed.data.incidentId, actorId, parsed.data);
    revalidatePath("/admin/quality/incidents");
    revalidatePath(`/admin/quality/incidents/${parsed.data.incidentId}`);
    revalidatePath("/app/incidents");
    return { error: null, success: "Incident status updated." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update incident.";
    return { error: message, success: null };
  }
}
