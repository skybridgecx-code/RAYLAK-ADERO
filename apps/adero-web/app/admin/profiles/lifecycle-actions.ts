"use server";

import {
  aderoAuditLogs,
  aderoCompanyProfiles,
  aderoOperatorProfiles,
  db,
} from "@raylak/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { PROFILE_STATUSES } from "~/lib/validators";
import { z } from "zod";

export type LifecycleActionState = {
  error: string | null;
  saved: boolean;
};

const LifecycleInput = z.object({
  memberType: z.enum(["company", "operator"]),
  profileId: z.string().uuid(),
  newStatus: z.enum(PROFILE_STATUSES),
  reason: z.string().trim().optional(),
  actorName: z.string().trim().optional(),
});

function actorOrSystem(actorName: string | null | undefined) {
  return actorName?.trim() || "Adero admin";
}

export async function setMemberLifecycleStatus(
  _prev: LifecycleActionState,
  formData: FormData,
): Promise<LifecycleActionState> {
  const result = LifecycleInput.safeParse({
    memberType: formData.get("memberType"),
    profileId: formData.get("profileId"),
    newStatus: formData.get("newStatus"),
    reason: formData.get("reason") ?? undefined,
    actorName: formData.get("actorName") ?? undefined,
  });

  if (!result.success) {
    return { error: "Invalid request.", saved: false };
  }

  const { memberType, profileId, newStatus, reason, actorName } = result.data;
  const now = new Date();
  const actor = actorOrSystem(actorName);

  try {
    await db.transaction(async (tx) => {
      if (memberType === "company") {
        const [profile] = await tx
          .select()
          .from(aderoCompanyProfiles)
          .where(eq(aderoCompanyProfiles.id, profileId));

        if (!profile) throw new Error("Company profile not found.");
        if (profile.activationStatus === newStatus) {
          throw new Error(`Profile is already ${newStatus}.`);
        }

        await tx
          .update(aderoCompanyProfiles)
          .set({ activationStatus: newStatus, updatedAt: now })
          .where(eq(aderoCompanyProfiles.id, profileId));

        await tx.insert(aderoAuditLogs).values({
          entityType: "company_profile",
          entityId: profile.id,
          applicationId: profile.applicationId,
          companyApplicationId: profile.applicationId,
          companyProfileId: profile.id,
          action: "profile_status_changed",
          actorName: actor,
          summary: `Company profile status changed from ${profile.activationStatus} to ${newStatus}.`,
          details: reason ? `Reason: ${reason}` : null,
          createdAt: now,
        });
      } else {
        const [profile] = await tx
          .select()
          .from(aderoOperatorProfiles)
          .where(eq(aderoOperatorProfiles.id, profileId));

        if (!profile) throw new Error("Operator profile not found.");
        if (profile.activationStatus === newStatus) {
          throw new Error(`Profile is already ${newStatus}.`);
        }

        await tx
          .update(aderoOperatorProfiles)
          .set({ activationStatus: newStatus, updatedAt: now })
          .where(eq(aderoOperatorProfiles.id, profileId));

        await tx.insert(aderoAuditLogs).values({
          entityType: "operator_profile",
          entityId: profile.id,
          applicationId: profile.applicationId,
          operatorApplicationId: profile.applicationId,
          operatorProfileId: profile.id,
          action: "profile_status_changed",
          actorName: actor,
          summary: `Operator profile status changed from ${profile.activationStatus} to ${newStatus}.`,
          details: reason ? `Reason: ${reason}` : null,
          createdAt: now,
        });
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status update failed.";
    console.error("[adero] setMemberLifecycleStatus failed:", err);
    return { error: message, saved: false };
  }

  revalidatePath("/admin/profiles");
  revalidatePath("/admin/profiles/companies");
  revalidatePath("/admin/profiles/operators");
  revalidatePath(
    memberType === "company"
      ? `/admin/profiles/companies/${profileId}`
      : `/admin/profiles/operators/${profileId}`,
  );
  return { error: null, saved: true };
}
