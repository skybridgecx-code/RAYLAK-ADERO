"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, aderoUsers } from "@raylak/db";
import { waivePenalty } from "@/lib/cancel-policy";

export type AdminPenaltyActionState = {
  error: string | null;
  success: string | null;
};

const WaiveSchema = z.object({
  penaltyId: z.string().uuid(),
  waivedReason: z.string().trim().min(1).max(2000),
});

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

export async function adminWaivePenalty(
  _prev: AdminPenaltyActionState,
  formData: FormData,
): Promise<AdminPenaltyActionState> {
  try {
    await assertAdminAccess();
  } catch {
    return { error: "Admin access required.", success: null };
  }

  const parsed = WaiveSchema.safeParse({
    penaltyId: formData.get("penaltyId"),
    waivedReason: formData.get("waivedReason"),
  });

  if (!parsed.success) {
    return { error: "Invalid waive request.", success: null };
  }

  try {
    const actorId = await getAdminActorId();
    await waivePenalty(parsed.data.penaltyId, actorId, parsed.data.waivedReason);
    revalidatePath("/admin/quality/penalties");
    return { error: null, success: "Penalty waived." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to waive penalty.";
    return { error: message, success: null };
  }
}
