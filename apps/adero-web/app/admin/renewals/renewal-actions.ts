"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  aderoAuditLogs,
  aderoCompanyProfiles,
  aderoMemberDocuments,
  aderoOperatorProfiles,
  db,
} from "@raylak/db";
import { getDocumentDisplayStatus } from "~/lib/document-monitoring";
import { sendRenewalOutreachEmail } from "~/lib/email";
import { MEMBER_DOCUMENT_TYPE_LABELS, type MemberDocumentType } from "~/lib/validators";

export type RenewalOutreachState = {
  error: string | null;
  sent: boolean;
};

const SendRenewalInput = z.object({
  memberType: z.enum(["company", "operator"]),
  profileId: z.string().uuid(),
  actorName: z.string().trim().optional(),
});

/**
 * Sends a renewal outreach email to a member, covering all their current
 * expired and expiring-soon documents. Logs to the audit trail with action
 * "renewal_outreach_emailed" so it appears in the member's portal delivery
 * history on their admin profile page.
 */
export async function sendRenewalOutreach(
  _prev: RenewalOutreachState,
  formData: FormData,
): Promise<RenewalOutreachState> {
  const result = SendRenewalInput.safeParse({
    memberType: formData.get("memberType"),
    profileId: formData.get("profileId"),
    actorName: formData.get("actorName") ?? undefined,
  });

  if (!result.success) {
    return { error: "Invalid request.", sent: false };
  }

  const { memberType, profileId, actorName } = result.data;
  const actor = actorName?.trim() || "Adero admin";
  const now = new Date();

  try {
    // ── Fetch profile + documents in parallel ────────────────────────────────
    const [documents, profileRows] = await Promise.all([
      db
        .select()
        .from(aderoMemberDocuments)
        .where(
          memberType === "company"
            ? eq(aderoMemberDocuments.companyProfileId, profileId)
            : eq(aderoMemberDocuments.operatorProfileId, profileId),
        ),
      memberType === "company"
        ? db
            .select({
              id: aderoCompanyProfiles.id,
              memberName: aderoCompanyProfiles.companyName,
              email: aderoCompanyProfiles.email,
              portalToken: aderoCompanyProfiles.portalToken,
              portalTokenExpiresAt: aderoCompanyProfiles.portalTokenExpiresAt,
              applicationId: aderoCompanyProfiles.applicationId,
            })
            .from(aderoCompanyProfiles)
            .where(eq(aderoCompanyProfiles.id, profileId))
            .limit(1)
        : db
            .select({
              id: aderoOperatorProfiles.id,
              memberName: aderoOperatorProfiles.fullName,
              email: aderoOperatorProfiles.email,
              portalToken: aderoOperatorProfiles.portalToken,
              portalTokenExpiresAt: aderoOperatorProfiles.portalTokenExpiresAt,
              applicationId: aderoOperatorProfiles.applicationId,
            })
            .from(aderoOperatorProfiles)
            .where(eq(aderoOperatorProfiles.id, profileId))
            .limit(1),
    ]);

    const profile = profileRows[0];
    if (!profile) return { error: "Member profile not found.", sent: false };

    if (profile.portalTokenExpiresAt && profile.portalTokenExpiresAt <= now) {
      return {
        error:
          "Portal link is expired. Rotate the token on the member profile page before sending renewal outreach.",
        sent: false,
      };
    }

    // ── Build renewal document lists ─────────────────────────────────────────
    const expiredLabels: string[] = [];
    const expiringSoonLabels: string[] = [];

    for (const doc of documents) {
      const displayStatus = getDocumentDisplayStatus(doc);
      const label =
        MEMBER_DOCUMENT_TYPE_LABELS[doc.documentType as MemberDocumentType] ?? doc.documentType;
      if (displayStatus === "expired") expiredLabels.push(label);
      else if (displayStatus === "expiring_soon") expiringSoonLabels.push(label);
    }

    if (expiredLabels.length === 0 && expiringSoonLabels.length === 0) {
      return {
        error: "No renewal-needed documents found for this member at this time.",
        sent: false,
      };
    }

    // ── Send email ────────────────────────────────────────────────────────────
    await sendRenewalOutreachEmail({
      to: profile.email,
      memberName: profile.memberName,
      portalToken: profile.portalToken,
      expiredDocumentLabels: expiredLabels,
      expiringSoonDocumentLabels: expiringSoonLabels,
    });

    // ── Audit log ─────────────────────────────────────────────────────────────
    const docSummary = [
      ...expiredLabels.map((l) => `${l} (expired)`),
      ...expiringSoonLabels.map((l) => `${l} (expiring soon)`),
    ].join(", ");

    await db.insert(aderoAuditLogs).values({
      entityType: `${memberType}_portal`,
      entityId: profileId,
      applicationId: profile.applicationId,
      companyApplicationId: memberType === "company" ? profile.applicationId : null,
      operatorApplicationId: memberType === "operator" ? profile.applicationId : null,
      companyProfileId: memberType === "company" ? profileId : null,
      operatorProfileId: memberType === "operator" ? profileId : null,
      action: "renewal_outreach_emailed",
      actorName: actor,
      summary: `Renewal outreach emailed to ${profile.email} for ${profile.memberName}.`,
      details: `Documents: ${docSummary}`,
      createdAt: now,
    });

    revalidatePath("/admin/renewals");
    revalidatePath(
      memberType === "company"
        ? `/admin/profiles/companies/${profileId}`
        : `/admin/profiles/operators/${profileId}`,
    );
  } catch (err) {
    console.error("[adero] sendRenewalOutreach failed:", err);
    return { error: "Email delivery failed. Please try again.", sent: false };
  }

  return { error: null, sent: true };
}
