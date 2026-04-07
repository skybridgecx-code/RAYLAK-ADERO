"use server";

import { aderoAuditLogs, aderoPortalSubmissions, db } from "@raylak/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ReviewInput = z.object({
  submissionId: z.string().uuid(),
  newStatus: z.enum(["reviewed", "dismissed"]),
  reviewedBy: z.string().trim().optional(),
  reviewNote: z.string().trim().optional(),
  memberType: z.enum(["company", "operator"]),
  profileId: z.string().uuid(),
});

export async function reviewPortalSubmission(formData: FormData): Promise<void> {
  const result = ReviewInput.safeParse({
    submissionId: formData.get("submissionId"),
    newStatus: formData.get("newStatus"),
    reviewedBy: formData.get("reviewedBy") ?? undefined,
    reviewNote: formData.get("reviewNote") ?? undefined,
    memberType: formData.get("memberType"),
    profileId: formData.get("profileId"),
  });

  if (!result.success) return;

  const { submissionId, newStatus, reviewedBy, reviewNote, memberType, profileId } = result.data;
  const actor = reviewedBy?.trim() || "Adero admin";
  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(aderoPortalSubmissions)
        .set({ status: newStatus, reviewedBy: actor, reviewNote: reviewNote ?? null, updatedAt: now })
        .where(eq(aderoPortalSubmissions.id, submissionId));

      await tx.insert(aderoAuditLogs).values({
        entityType: `${memberType}_portal`,
        entityId: profileId,
        companyProfileId: memberType === "company" ? profileId : null,
        operatorProfileId: memberType === "operator" ? profileId : null,
        action: `portal_submission_${newStatus}`,
        actorName: actor,
        summary: `Portal document submission marked as ${newStatus}.`,
        createdAt: now,
      });
    });
  } catch (err) {
    console.error("[adero] reviewPortalSubmission failed:", err);
    return;
  }

  revalidatePath(
    memberType === "company"
      ? `/admin/profiles/companies/${profileId}`
      : `/admin/profiles/operators/${profileId}`,
  );
  revalidatePath("/admin/submissions");
}
