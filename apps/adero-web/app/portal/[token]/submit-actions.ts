"use server";

import {
  aderoAuditLogs,
  aderoCompanyProfiles,
  aderoDocumentComplianceNotifications,
  aderoMemberDocuments,
  aderoOperatorProfiles,
  aderoPortalSubmissions,
  db,
} from "@raylak/db";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AderoMemberType } from "~/lib/document-monitoring";
import { getMemberDocumentSummary } from "~/lib/document-monitoring";
import { getCurrentComplianceAction } from "~/lib/document-compliance";
import {
  getCurrentSubmissionByDocumentType,
  needsMemberResubmission,
  toKnownDocumentType,
} from "~/lib/portal-submission-threading";
import {
  MEMBER_DOCUMENT_TYPES,
  type MemberDocumentComplianceAction,
  type MemberDocumentType,
} from "~/lib/validators";

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
  // Optional — populated when a file was uploaded via presigned URL before form submit
  fileKey: z.string().min(1).optional(),
  fileName: z.string().min(1).optional(),
  fileSizeBytes: z.coerce.number().int().positive().optional(),
});

const FOLLOW_UP_ACTIONS: MemberDocumentComplianceAction[] = ["follow_up_needed", "reminder_sent"];

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
    fileKey: formData.get("fileKey") ?? undefined,
    fileName: formData.get("fileName") ?? undefined,
    fileSizeBytes: formData.get("fileSizeBytes") ?? undefined,
  });

  if (!result.success) {
    return { error: result.error.errors[0]?.message ?? "Invalid submission.", submitted: false };
  }

  const { token, memberType, profileId, documentType, memberNote, fileKey, fileName, fileSizeBytes } =
    result.data;
  const now = new Date();

  // Verify the portal token still matches this profile and is not expired.
  try {
    if (memberType === "company") {
      const [profile] = await db
        .select({ id: aderoCompanyProfiles.id, portalTokenExpiresAt: aderoCompanyProfiles.portalTokenExpiresAt })
        .from(aderoCompanyProfiles)
        .where(eq(aderoCompanyProfiles.portalToken, token))
        .limit(1);
      if (!profile || profile.id !== profileId) {
        return { error: "Session invalid. Please reload the page.", submitted: false };
      }
      if (profile.portalTokenExpiresAt && profile.portalTokenExpiresAt <= new Date()) {
        return {
          error: "This portal link has expired. Please contact your Adero representative.",
          submitted: false,
        };
      }
    } else {
      const [profile] = await db
        .select({ id: aderoOperatorProfiles.id, portalTokenExpiresAt: aderoOperatorProfiles.portalTokenExpiresAt })
        .from(aderoOperatorProfiles)
        .where(eq(aderoOperatorProfiles.portalToken, token))
        .limit(1);
      if (!profile || profile.id !== profileId) {
        return { error: "Session invalid. Please reload the page.", submitted: false };
      }
      if (profile.portalTokenExpiresAt && profile.portalTokenExpiresAt <= new Date()) {
        return {
          error: "This portal link has expired. Please contact your Adero representative.",
          submitted: false,
        };
      }
    }

    const memberDocumentFilter =
      memberType === "company"
        ? eq(aderoMemberDocuments.companyProfileId, profileId)
        : eq(aderoMemberDocuments.operatorProfileId, profileId);

    const complianceNotificationFilter =
      memberType === "company"
        ? eq(aderoDocumentComplianceNotifications.companyProfileId, profileId)
        : eq(aderoDocumentComplianceNotifications.operatorProfileId, profileId);

    const submissionMemberFilter =
      memberType === "company"
        ? eq(aderoPortalSubmissions.companyProfileId, profileId)
        : eq(aderoPortalSubmissions.operatorProfileId, profileId);

    const [documents, complianceNotifications, existingSubmissions] = await Promise.all([
      db
        .select()
        .from(aderoMemberDocuments)
        .where(memberDocumentFilter)
        .orderBy(desc(aderoMemberDocuments.updatedAt)),
      db
        .select()
        .from(aderoDocumentComplianceNotifications)
        .where(complianceNotificationFilter)
        .orderBy(desc(aderoDocumentComplianceNotifications.createdAt)),
      db
        .select({
          id: aderoPortalSubmissions.id,
          documentType: aderoPortalSubmissions.documentType,
          status: aderoPortalSubmissions.status,
          createdAt: aderoPortalSubmissions.createdAt,
          supersedesSubmissionId: aderoPortalSubmissions.supersedesSubmissionId,
        })
        .from(aderoPortalSubmissions)
        .where(submissionMemberFilter)
        .orderBy(desc(aderoPortalSubmissions.createdAt)),
    ]);

    const summary = getMemberDocumentSummary(memberType as AderoMemberType, documents);
    const attentionTypes = summary.requiredDocuments
      .filter((entry) => {
        const complianceAction = getCurrentComplianceAction(
          complianceNotifications,
          memberType,
          profileId,
          entry.documentType,
        );

        const needsFollowUp = FOLLOW_UP_ACTIONS.includes(
          complianceAction as MemberDocumentComplianceAction,
        );

        return (
          needsFollowUp ||
          entry.displayStatus === "missing" ||
          entry.displayStatus === "expired" ||
          entry.displayStatus === "expiring_soon"
        );
      })
      .map((entry) => entry.documentType);

    const currentSubmissionByDocumentType = getCurrentSubmissionByDocumentType(existingSubmissions);
    const resubmissionTypes = Array.from(currentSubmissionByDocumentType.entries())
      .filter(([, submission]) => needsMemberResubmission(submission.status))
      .map(([documentTypeKey]) => toKnownDocumentType(documentTypeKey))
      .filter((value): value is MemberDocumentType => value !== null);

    const allowedDocumentTypes = new Set<MemberDocumentType>([
      ...attentionTypes,
      ...resubmissionTypes,
    ]);

    if (!allowedDocumentTypes.has(documentType)) {
      return {
        error:
          "This document type is not currently open for portal submission. Please refresh and use the listed follow-up items.",
        submitted: false,
      };
    }

    let submissionError: string | null = null;

    await db.transaction(async (tx) => {
      const existingForDocument = await tx
        .select({
          id: aderoPortalSubmissions.id,
          documentType: aderoPortalSubmissions.documentType,
          status: aderoPortalSubmissions.status,
          createdAt: aderoPortalSubmissions.createdAt,
          supersedesSubmissionId: aderoPortalSubmissions.supersedesSubmissionId,
        })
        .from(aderoPortalSubmissions)
        .where(
          and(
            submissionMemberFilter,
            eq(aderoPortalSubmissions.documentType, documentType),
          ),
        );

      const currentSubmissionForDocument =
        getCurrentSubmissionByDocumentType(existingForDocument).get(documentType) ?? null;

      if (currentSubmissionForDocument?.status === "pending") {
        submissionError =
          "A previous submission for this document is still under review. Please wait for staff review before submitting another update.";
        return;
      }

      const isResubmission = currentSubmissionForDocument
        ? needsMemberResubmission(currentSubmissionForDocument.status)
        : false;

      await tx.insert(aderoPortalSubmissions).values({
        memberType,
        companyProfileId: memberType === "company" ? profileId : null,
        operatorProfileId: memberType === "operator" ? profileId : null,
        documentType,
        memberNote,
        fileKey: fileKey ?? null,
        fileName: fileName ?? null,
        fileSizeBytes: fileSizeBytes ?? null,
        status: "pending",
        supersedesSubmissionId: currentSubmissionForDocument?.id ?? null,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(aderoAuditLogs).values({
        entityType: `${memberType}_portal`,
        entityId: profileId,
        companyProfileId: memberType === "company" ? profileId : null,
        operatorProfileId: memberType === "operator" ? profileId : null,
        action: isResubmission ? "portal_document_resubmitted" : "portal_document_submitted",
        actorName: null,
        summary: isResubmission
          ? `Member submitted follow-up for ${documentType} after ${currentSubmissionForDocument?.status ?? "staff review"} via portal.${fileKey ? " File attached." : ""}`
          : `Member submitted document update for ${documentType} via portal.${fileKey ? " File attached." : ""}`,
        details:
          currentSubmissionForDocument
            ? `Supersedes submission ${currentSubmissionForDocument.id} (${currentSubmissionForDocument.status}).`
            : null,
        createdAt: now,
      });
    });

    if (submissionError) {
      return { error: submissionError, submitted: false };
    }
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      return {
        error:
          "A newer submission already exists for this document. Please refresh to see the latest status.",
        submitted: false,
      };
    }
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      ((err as { code?: string }).code === "P0001" || (err as { code?: string }).code === "23514")
    ) {
      return {
        error:
          "Submission chain validation failed. Please refresh and try again.",
        submitted: false,
      };
    }
    console.error("[adero] submitPortalDocument failed:", err);
    return { error: "Submission failed. Please try again.", submitted: false };
  }

  revalidatePath(`/portal/${token}`);
  return { error: null, submitted: true };
}
