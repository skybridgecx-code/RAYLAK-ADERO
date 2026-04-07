"use server";

import { randomUUID } from "crypto";
import {
  aderoAuditLogs,
  aderoCompanyProfiles,
  aderoOperatorProfiles,
  db,
} from "@raylak/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type PortalActionState = {
  error: string | null;
  saved: boolean;
};

// ─── Rotate portal token ──────────────────────────────────────────────────────

const RotateInput = z.object({
  memberType: z.enum(["company", "operator"]),
  profileId: z.string().uuid(),
  actorName: z.string().trim().optional(),
});

export async function rotatePortalToken(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const result = RotateInput.safeParse({
    memberType: formData.get("memberType"),
    profileId: formData.get("profileId"),
    actorName: formData.get("actorName") ?? undefined,
  });

  if (!result.success) {
    return { error: "Invalid request.", saved: false };
  }

  const { memberType, profileId, actorName } = result.data;
  const newToken = randomUUID();
  const actor = actorName?.trim() || "Adero admin";
  const now = new Date();

  try {
    if (memberType === "company") {
      await db.transaction(async (tx) => {
        const [profile] = await tx
          .select()
          .from(aderoCompanyProfiles)
          .where(eq(aderoCompanyProfiles.id, profileId));

        if (!profile) throw new Error("Profile not found.");

        await tx
          .update(aderoCompanyProfiles)
          .set({ portalToken: newToken, updatedAt: now })
          .where(eq(aderoCompanyProfiles.id, profileId));

        await tx.insert(aderoAuditLogs).values({
          entityType: "company_portal",
          entityId: profile.id,
          applicationId: profile.applicationId,
          companyApplicationId: profile.applicationId,
          companyProfileId: profile.id,
          action: "portal_token_rotated",
          actorName: actor,
          summary: `Portal access token rotated for ${profile.companyName}. Previous link invalidated.`,
          createdAt: now,
        });
      });

      revalidatePath(`/admin/profiles/companies/${profileId}`);
    } else {
      await db.transaction(async (tx) => {
        const [profile] = await tx
          .select()
          .from(aderoOperatorProfiles)
          .where(eq(aderoOperatorProfiles.id, profileId));

        if (!profile) throw new Error("Profile not found.");

        await tx
          .update(aderoOperatorProfiles)
          .set({ portalToken: newToken, updatedAt: now })
          .where(eq(aderoOperatorProfiles.id, profileId));

        await tx.insert(aderoAuditLogs).values({
          entityType: "operator_portal",
          entityId: profile.id,
          applicationId: profile.applicationId,
          operatorApplicationId: profile.applicationId,
          operatorProfileId: profile.id,
          action: "portal_token_rotated",
          actorName: actor,
          summary: `Portal access token rotated for ${profile.fullName}. Previous link invalidated.`,
          createdAt: now,
        });
      });

      revalidatePath(`/admin/profiles/operators/${profileId}`);
    }
  } catch (err) {
    console.error("[adero] rotatePortalToken failed:", err);
    return { error: "Token rotation failed. Please try again.", saved: false };
  }

  return { error: null, saved: true };
}

// ─── Log portal delivery event ────────────────────────────────────────────────

const DeliveryInput = z.object({
  memberType: z.enum(["company", "operator"]),
  profileId: z.string().uuid(),
  memberName: z.string().trim().min(1),
  eventType: z.enum(["link_copied", "link_shared"]),
  actorName: z.string().trim().optional(),
});

export async function logPortalDeliveryEvent(formData: FormData): Promise<void> {
  const result = DeliveryInput.safeParse({
    memberType: formData.get("memberType"),
    profileId: formData.get("profileId"),
    memberName: formData.get("memberName"),
    eventType: formData.get("eventType"),
    actorName: formData.get("actorName") ?? undefined,
  });

  if (!result.success) return;

  const { memberType, profileId, memberName, eventType, actorName } = result.data;
  const actor = actorName?.trim() || null;
  const now = new Date();

  const summary =
    eventType === "link_copied"
      ? `Portal link copied for ${memberName}.`
      : `Portal link marked as shared for ${memberName}.`;

  try {
    await db.insert(aderoAuditLogs).values({
      entityType: `${memberType}_portal`,
      entityId: profileId,
      companyProfileId: memberType === "company" ? profileId : null,
      operatorProfileId: memberType === "operator" ? profileId : null,
      action: eventType === "link_copied" ? "portal_link_copied" : "portal_link_shared",
      actorName: actor,
      summary,
      createdAt: now,
    });
  } catch {
    // Delivery logging is best-effort; do not surface errors to the client.
  }

  // Revalidate on explicit share action so delivery history updates immediately.
  if (eventType === "link_shared") {
    revalidatePath(
      memberType === "company"
        ? `/admin/profiles/companies/${profileId}`
        : `/admin/profiles/operators/${profileId}`,
    );
  }
}
