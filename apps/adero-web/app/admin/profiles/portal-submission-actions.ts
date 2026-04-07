"use server";

import {
  aderoAuditLogs,
  aderoCompanyProfiles,
  aderoOperatorProfiles,
  aderoPortalSubmissions,
  db,
} from "@raylak/db";
import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const REVIEW_OUTCOMES = ["accepted", "rejected", "needs_follow_up"] as const;

const ReviewInput = z.object({
  submissionId: z.string().uuid(),
  newStatus: z.enum(REVIEW_OUTCOMES),
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
  const note = reviewNote?.trim() || null;
  const now = new Date();
  const statusLabel: Record<(typeof REVIEW_OUTCOMES)[number], string> = {
    accepted: "was accepted",
    rejected: "was rejected",
    needs_follow_up: "requires follow-up",
  };

  try {
    await db.transaction(async (tx) => {
      const [submission] = await tx
        .select({
          id: aderoPortalSubmissions.id,
          status: aderoPortalSubmissions.status,
          documentType: aderoPortalSubmissions.documentType,
          createdAt: aderoPortalSubmissions.createdAt,
        })
        .from(aderoPortalSubmissions)
        .where(
          and(
            eq(aderoPortalSubmissions.id, submissionId),
            memberType === "company"
              ? eq(aderoPortalSubmissions.companyProfileId, profileId)
              : eq(aderoPortalSubmissions.operatorProfileId, profileId),
          ),
        )
        .limit(1);

      if (!submission || submission.status !== "pending") return;

      const memberScopeFilter =
        memberType === "company"
          ? eq(aderoPortalSubmissions.companyProfileId, profileId)
          : eq(aderoPortalSubmissions.operatorProfileId, profileId);

      const [newerSubmission] = await tx
        .select({ id: aderoPortalSubmissions.id })
        .from(aderoPortalSubmissions)
        .where(
          and(
            memberScopeFilter,
            eq(aderoPortalSubmissions.documentType, submission.documentType),
            gt(aderoPortalSubmissions.createdAt, submission.createdAt),
          ),
        )
        .limit(1);

      // Do not review stale pending entries that were followed by a newer member response.
      if (newerSubmission) return;

      await tx
        .update(aderoPortalSubmissions)
        .set({ status: newStatus, reviewedBy: actor, reviewNote: note, updatedAt: now })
        .where(eq(aderoPortalSubmissions.id, submissionId));

      await tx.insert(aderoAuditLogs).values({
        entityType: `${memberType}_portal`,
        entityId: profileId,
        companyProfileId: memberType === "company" ? profileId : null,
        operatorProfileId: memberType === "operator" ? profileId : null,
        action: `portal_submission_${newStatus}`,
        actorName: actor,
        summary: `Portal submission for ${submission.documentType} ${statusLabel[newStatus]}.`,
        details: note ? `Review note: ${note}` : null,
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

  const [portalRow] = memberType === "company"
    ? await db
        .select({ portalToken: aderoCompanyProfiles.portalToken })
        .from(aderoCompanyProfiles)
        .where(eq(aderoCompanyProfiles.id, profileId))
        .limit(1)
    : await db
        .select({ portalToken: aderoOperatorProfiles.portalToken })
        .from(aderoOperatorProfiles)
        .where(eq(aderoOperatorProfiles.id, profileId))
        .limit(1);

  if (portalRow?.portalToken) {
    revalidatePath(`/portal/${portalRow.portalToken}`);
  }
}
