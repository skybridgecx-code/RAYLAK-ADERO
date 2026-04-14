"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recalculateTrustScore } from "@/lib/trust-score";

export type AdminTrustActionState = {
  error: string | null;
  success: string | null;
};

const RecalculateSchema = z.object({
  userId: z.string().uuid(),
});

async function assertAdminAccess(): Promise<void> {
  const secret = process.env["ADERO_ADMIN_SECRET"];
  const cookieStore = await cookies();
  const session = cookieStore.get("adero_admin")?.value;

  if (!secret || session !== secret) {
    throw new Error("Admin access required.");
  }
}

export async function adminRecalculateTrust(
  _prev: AdminTrustActionState,
  formData: FormData,
): Promise<AdminTrustActionState> {
  try {
    await assertAdminAccess();
  } catch {
    return { error: "Admin access required.", success: null };
  }

  const parsed = RecalculateSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    return { error: "Invalid user id.", success: null };
  }

  try {
    await recalculateTrustScore(parsed.data.userId);
    revalidatePath("/admin/quality/trust");
    return { error: null, success: "Trust score recalculated." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to recalculate trust score.";
    return { error: message, success: null };
  }
}
