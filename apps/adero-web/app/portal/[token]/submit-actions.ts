"use server";

import {
  aderoAuditLogs,
  aderoCompanyProfiles,
  aderoOperatorProfiles,
  aderoPortalSubmissions,
  db,
} from "@raylak/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MEMBER_DOCUMENT_TYPES } from "~/lib/validators";

export type PortalSubmitState = {
  error: string | null;
  submitted: boolean;
};

const SubmitInput = z.object({
  token: z.string().uuid(),
  memberType: z.enum(["company", "operator"]),
  profileId: z.string().uuid(),
  documentType: z.enum(MEMBER_DOCUMENT_TYPES),
  memberNote: z
    .string()
    .trim()
    .min(5, "Please describe what you are submitting (at least 5 characters).")
    .max(1000, "Note must be 1000 characters or fewer."),
});

export async function submitPortalDocument(
  _prev: PortalSubmitState,
  formData: FormData,
): Promise<PortalSubmitState> {
  const result = SubmitInput.safeParse({
    token: formData.get("token"),
    memberType: formData.get("memberType"),
    profileId: formData.get("profileId"),
    documentType: formData.get("documentType"),
    memberNote: formData.get("memberNote"),
  });

  if (!result.success) {
    return { error: result.error.errors[0]?.message ?? "Invalid submission.", submitted: false };
  }

  const { token, memberType, profileId, documentType, memberNote } = result.data;
  const now = new Date();

  // Verify the portal token still matches this profile (guards against stale tokens)
  try {
    if (memberType === "company") {
      const [profile] = await db
        .select({ id: aderoCompanyProfiles.id })
        .from(aderoCompanyProfiles)
        .where(eq(aderoCompanyProfiles.portalToken, token))
        .limit(1);
      if (!profile || profile.id !== profileId) {
        return { error: "Session invalid. Please reload the page.", submitted: false };
      }
    } else {
      const [profile] = await db
        .select({ id: aderoOperatorProfiles.id })
        .from(aderoOperatorProfiles)
        .where(eq(aderoOperatorProfiles.portalToken, token))
        .limit(1);
      if (!profile || profile.id !== profileId) {
        return { error: "Session invalid. Please reload the page.", submitted: false };
      }
    }

    await db.transaction(async (tx) => {
      await tx.insert(aderoPortalSubmissions).values({
        memberType,
        companyProfileId: memberType === "company" ? profileId : null,
        operatorProfileId: memberType === "operator" ? profileId : null,
        documentType,
        memberNote,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(aderoAuditLogs).values({
        entityType: `${memberType}_portal`,
        entityId: profileId,
        companyProfileId: memberType === "company" ? profileId : null,
        operatorProfileId: memberType === "operator" ? profileId : null,
        action: "portal_document_submitted",
        actorName: null,
        summary: `Member submitted document update for ${documentType} via portal.`,
        createdAt: now,
      });
    });
  } catch (err) {
    console.error("[adero] submitPortalDocument failed:", err);
    return { error: "Submission failed. Please try again.", submitted: false };
  }

  revalidatePath(`/portal/${token}`);
  return { error: null, submitted: true };
}
